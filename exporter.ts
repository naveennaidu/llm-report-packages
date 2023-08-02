import { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import axios from "axios";
import { ExportResultCode, ExportResult } from "@opentelemetry/core";

export class MyCustomExporter implements SpanExporter {
  private serverAddress = "http://localhost:3000/api/v1/log/openai";
  private xApiKey: string;
  constructor(apiKey: string) {
    this.xApiKey = apiKey;
  }

  export(
    spans: ReadableSpan[],
    resultCallback: (result: ExportResult) => void
  ) {
    spans.forEach((span) => {
      if (!checkOpenAIUrl(span.attributes["http.url"]?.toString())) return;

      console.log(span.attributes);
      //TODO: Map logData
      let logData = { url: span.attributes["http.url"] };
      axios
        .post(this.serverAddress, logData, {
          headers: {
            "Content-Type": "application/json",
            "X-Api-Key": this.xApiKey,
          },
        })
        .then((response) => {
          console.log(`StatusCode: ${response.status}`);
        })
        .catch((error) => {
          console.error("Error while sending log data:", error);
        });
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
