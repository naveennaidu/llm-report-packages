import { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import axios from "axios";
import { ExportResultCode, ExportResult } from "@opentelemetry/core";
import { numTokensFromMessages, getTokenCount, sha256 } from "./utils";

export class LlmReportExporter implements SpanExporter {
  private serverAddress = "http://localhost:3000/api/v1/log/openai";
  private xApiKey: string;
  constructor(apiKey: string) {
    this.xApiKey = apiKey;
  }

  export(
    spans: ReadableSpan[],
    resultCallback: (result: ExportResult) => void
  ) {
    spans.forEach(async (span) => {
      if (checkOpenAIUrl(span.attributes["http.url"]?.toString())) {
        try {
          const data = convertToOutputFormat(span.attributes);
          await axios.post(this.serverAddress, data, {
            headers: {
              "x-api-key": this.xApiKey,
            },
          });
        } catch (error) {
          console.log(error);
        }
      }
    });

    return resultCallback({ code: ExportResultCode.SUCCESS });
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}

function checkOpenAIUrl(url?: string): boolean {
  if (!url) return false;
  return url.includes("api.openai.com");
}

function convertToOutputFormat(attributes: any) {
  let rb = attributes["http.response.body"];
  let streamed = false;
  let data: any;
  let completion = "";

  try {
    data = JSON.parse(rb);
    completion = data["choices"][0]["message"]["content"];
  } catch {
    rb = rb
      .split("\n\n")
      .filter((line: string) => line !== "")
      .map((line: string) =>
        line.startsWith("data:") ? line.substring(6) : line
      )
      .filter((line: string) => line !== "[DONE]");
    rb.forEach((line: string) => {
      let chunkData = JSON.parse(line);
      if (chunkData.choices[0].delta.hasOwnProperty("content")) {
        completion += chunkData.choices[0].delta.content;
      }
    });

    data = JSON.parse(rb[rb.length - 1]);
    streamed = true;
  }

  const requestHeaders = attributes["http.request.headers"];
  const parsedRequestHeaders = JSON.parse(requestHeaders);
  const authorization = parsedRequestHeaders["Authorization"].split(" ")[1];
  delete parsedRequestHeaders["Authorization"];
  const userId = parsedRequestHeaders["X-User-Id"];

  const requestBody = attributes["http.request.body"];
  const parsedRequestBody = JSON.parse(requestBody);
  let prompt_tokens = 0;
  let completion_tokens = 0;

  if (data["usage"]) {
    prompt_tokens = data["usage"]["prompt_tokens"];
    completion_tokens = data["usage"]["completion_tokens"];
  } else {
    prompt_tokens = numTokensFromMessages(parsedRequestBody["messages"]);
    completion_tokens = getTokenCount(completion);
  }

  return {
    provider_id: data["id"],
    user_id: userId,
    url: attributes["http.url"],
    method: attributes["http.method"],
    status: attributes["http.status_code"],
    streamed: streamed,
    model: data["model"],
    prompt_tokens,
    completion_tokens,
    hashed_key: sha256(authorization),
    completion: completion,
    request_headers: JSON.stringify(parsedRequestHeaders),
    request_body: requestBody,
    response_headers: attributes["http.response.headers"],
    response_body: attributes["http.response.body"],
  };
}
