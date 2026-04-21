import OpenAI from "openai";
import { createEmptyTenderExtraction } from "@/lib/tender/default-extraction";
import { TenderExtractionError } from "@/lib/tender/extraction-error";
import { buildTenderExtractionUserPrompt, TENDER_EXTRACTION_SYSTEM_PROMPT } from "@/lib/tender/prompt";
import { normalizeTenderExtraction } from "@/lib/tender/normalization";
import type { TenderExtraction } from "@/lib/tender/schema";

let client: OpenAI | null = null;

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new TenderExtractionError("OpenAI extraction is not configured.", 500, [
      "Set OPENAI_API_KEY in your environment before extracting tender PDFs."
    ]);
  }

  client ??= new OpenAI({ apiKey });
  return client;
}

export async function extractTenderChunkWithOpenAI(input: {
  documentText: string;
  fileName: string;
  pageCount: number;
  timestamp: string;
}): Promise<TenderExtraction> {
  const model = process.env.OPENAI_EXTRACTION_MODEL || process.env.OPENAI_MODEL || "gpt-4.1";
  const schemaExample = JSON.stringify(
    createEmptyTenderExtraction({
      fileName: input.fileName,
      pageCount: input.pageCount,
      timestamp: input.timestamp
    }),
    null,
    2
  );

  const messages = [
    {
      role: "system" as const,
      content: TENDER_EXTRACTION_SYSTEM_PROMPT
    },
    {
      role: "user" as const,
      content: buildTenderExtractionUserPrompt(schemaExample, input.documentText)
    }
  ];

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await getOpenAIClient().chat.completions.create({
        model,
        messages:
          attempt === 0
            ? messages
            : [
                ...messages,
                {
                  role: "user" as const,
                  content:
                    "Retry: return only valid JSON matching the schema. No markdown fences."
                }
              ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new TenderExtractionError("OpenAI returned an empty extraction response.", 502);
      }

      return normalizeTenderExtraction(JSON.parse(content), {
        fileName: input.fileName,
        pageCount: input.pageCount,
        timestamp: input.timestamp
      });
    } catch (error) {
      const mappedError = mapOpenAIError(error);

      if (mappedError || attempt === 1) {
        throw mappedError ?? new TenderExtractionError(
          "OpenAI returned JSON that did not match the tender extraction schema.",
          502,
          ["The model response could not be validated after retry."]
        );
      }

      console.warn("Tender OpenAI extraction returned invalid JSON; retrying once.");
    }
  }

  throw new TenderExtractionError("OpenAI tender extraction failed.", 502);
}

function mapOpenAIError(error: unknown) {
  const status = typeof error === "object" && error !== null && "status" in error
    ? Number((error as { status?: unknown }).status)
    : undefined;

  if (status === 401) {
    return new TenderExtractionError("OpenAI rejected the configured API key.", 401, [
      "Replace OPENAI_API_KEY in .env or .env.local with a valid key and restart npm run dev."
    ]);
  }

  if (status === 403) {
    return new TenderExtractionError("OpenAI access is forbidden for this key or project.", 403, [
      "Check that the API key belongs to a project with access to the configured model."
    ]);
  }

  if (status === 429) {
    return new TenderExtractionError("OpenAI rate limit or quota was reached.", 429, [
      "Check account billing, quota, and rate limits before retrying."
    ]);
  }

  if (status && status >= 500) {
    return new TenderExtractionError("OpenAI service returned a temporary server error.", 502, [
      "Retry the extraction after a short delay."
    ]);
  }

  return null;
}
