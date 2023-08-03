/*instrumentation.ts*/
import { NodeSDK, api } from "@opentelemetry/sdk-node";
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-node";
import {
  HttpInstrumentation,
  HttpInstrumentationConfig,
} from "@opentelemetry/instrumentation-http";
import { LlmReportExporter } from "./exporter";

const configuration: HttpInstrumentationConfig = {
  ignoreOutgoingRequestHook: (options) => {
    // Only trace requests to the OpenAI API
    return options.hostname !== "api.openai.com";
  },
  responseHook: (span, response) => {
    let body = "";
    response.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    response.on("end", () => {
      span.setAttribute("http.response.body", body);
      response.removeAllListeners();
    });
  },
  headersToSpanAttributes: {
    client: {
      requestHeaders: ["x-user-id"],
      responseHeaders: ["openai-model"],
    },
  },
};

export const llmReportSdk = (apiKey: string) => {
  return new NodeSDK({
    traceExporter: new LlmReportExporter(apiKey),
    instrumentations: [new HttpInstrumentation(configuration)],
  });
};
