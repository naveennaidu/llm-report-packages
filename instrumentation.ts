/*instrumentation.ts*/
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-node";
import {
  HttpInstrumentation,
  HttpInstrumentationConfig,
} from "@opentelemetry/instrumentation-http";
import { MyCustomExporter } from "./exporter";

const LLM_REPORT_API_KEY =
  "f318801ca9b6860fadb1bf1c328ba8ccc08757e96aa1ffae1ac550b0a0f006ba";
const configuration: HttpInstrumentationConfig = {
  ignoreOutgoingRequestHook: (options) => {
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

const sdk = new NodeSDK({
  traceExporter: new MyCustomExporter(LLM_REPORT_API_KEY),
  instrumentations: [new HttpInstrumentation(configuration)],
});

sdk.start();
