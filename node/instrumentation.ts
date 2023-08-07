/*instrumentation.ts*/
import { NodeSDK, api } from "@opentelemetry/sdk-node";
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
  requestHook: (span, options: any) => {
    // Intercept body
    const chunks: Buffer[] = [];
    const originalWrite = options.write;
    const originalEnd = options.end;

    options.write = function (chunk: any) {
      chunks.push(Buffer.from(chunk));
      originalWrite.apply(this, arguments);
    };

    options.end = function (chunk: any) {
      if (chunk) chunks.push(Buffer.from(chunk));
      const requestBody = Buffer.concat(chunks).toString();
      span.setAttribute("http.request.body", requestBody);
      originalEnd.apply(this, arguments);
    };

    return options;
  },
  startOutgoingSpanHook: (request) => {
    return {
      "http.request.headers": JSON.stringify(request.headers),
    } as any;
  },
  responseHook: (span, response: any) => {
    span.setAttribute(
      "http.response.headers",
      JSON.stringify(response.headers)
    );

    let body = "";
    response.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    response.on("end", () => {
      span.setAttribute("http.response.body", body);
      response.removeAllListeners();
    });
  },
};

export const llmReportSdk = (apiKey: string) => {
  return new NodeSDK({
    traceExporter: new LlmReportExporter(apiKey),
    instrumentations: [new HttpInstrumentation(configuration)],
  });
};
