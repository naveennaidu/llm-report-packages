import express, { Express } from "express";
import { Configuration, OpenAIApi } from "openai";
import { RequestInfo, RequestInit, Response } from "node-fetch";

const _importDynamic = new Function("modulePath", "return import(modulePath)");

export const nodeFetch = async function (
  url: URL | RequestInfo,
  init?: RequestInit
): Promise<Response> {
  const { default: fetch } = await _importDynamic("node-fetch");
  return fetch(url, init);
};

const PORT: number = parseInt(process.env.PORT || "8080");
const app: Express = express();

const configuration = new Configuration({
  apiKey: "sk-...",
  baseOptions: {
    headers: {
      "X-User-Id": `myuser@example.com`,
    },
  },
});
const openai = new OpenAIApi(configuration);

app.get("/", async (req, res) => {
  const chatCompletion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: "Hello world" }],
  });

  const response = await nodeFetch("https://example.com");
  res.send("Hello world");
});

app.listen(PORT, () => {
  console.log(`Listening for requests on http://localhost:${PORT}`);
});
