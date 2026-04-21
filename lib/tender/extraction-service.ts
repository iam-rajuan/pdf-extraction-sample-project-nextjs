import { createEmptyTenderExtraction } from "@/lib/tender/default-extraction";
import { extractTenderChunkWithOpenAI } from "@/lib/tender/openai-service";
import { buildChunkContext, prepareTenderText } from "@/lib/tender/preprocess";
import { mergeTenderExtractions, normalizeTenderExtraction } from "@/lib/tender/normalization";
import type { TenderExtraction } from "@/lib/tender/schema";

export async function extractTenderFromText(input: {
  text: string;
  fileName: string;
  pageCount: number;
}): Promise<TenderExtraction> {
  const timestamp = new Date().toISOString();
  const prepared = prepareTenderText(input.text);

  if (!prepared.cleanedText) {
    throw new Error("No machine-readable tender text was available after PDF parsing.");
  }

  let merged = createEmptyTenderExtraction({
    fileName: input.fileName,
    pageCount: input.pageCount,
    timestamp
  });

  for (let index = 0; index < prepared.chunks.length; index += 1) {
    const chunkExtraction = await extractTenderChunkWithOpenAI({
      documentText: buildChunkContext({
        chunk: prepared.chunks[index],
        chunkIndex: index,
        chunkCount: prepared.chunks.length,
        detectedLabels: prepared.detectedLabels
      }),
      fileName: input.fileName,
      pageCount: input.pageCount,
      timestamp
    });

    merged = mergeTenderExtractions(merged, chunkExtraction);
  }

  return normalizeTenderExtraction(merged, {
    fileName: input.fileName,
    pageCount: input.pageCount,
    timestamp
  });
}
