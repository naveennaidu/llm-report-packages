import { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import axios from "axios";
import { ExportResultCode, ExportResult } from "@opentelemetry/core";
import { AttributeValue } from "@opentelemetry/api";

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
    spans.forEach((span) => {
      if (!checkOpenAIUrl(span.attributes["http.url"]?.toString())) return;
      axios
        .post(
          this.serverAddress,
          {
            attributes: span.attributes,
            startTime: span.startTime,
            endTime: span.endTime,
            duration: span.duration,
          },
          {
            headers: {
              "Content-Type": "application/json",
              "X-Api-Key": this.xApiKey,
            },
          }
        )
        .catch((_) => {});
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
