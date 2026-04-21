import { NextResponse } from "next/server";
import { z } from "zod";
import { extractTextFromPdf, isMeaningfulText } from "@/lib/pdf/extract-text";
import { isTenderExtractionError } from "@/lib/tender/extraction-error";
import { extractTenderFromText } from "@/lib/tender/extraction-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function maxFileSizeBytes() {
  const configured = Number(process.env.MAX_FILE_SIZE_MB ?? 20);
  const safeMegabytes = Number.isFinite(configured) && configured > 0 ? configured : 20;
  return safeMegabytes * 1024 * 1024;
}

function uploadSchema() {
  return z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    size: z.number().positive().max(maxFileSizeBytes())
  });
}

function failure(message: string, warnings: string[] = [], status = 400) {
  return NextResponse.json(
    {
      success: false,
      message,
      warnings
    },
    { status }
  );
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return failure("No PDF file was provided.", ["Upload a valid PDF file and try again."]);
    }

    const fileInput = uploadSchema().safeParse({
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size
    });

    const looksLikePdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!fileInput.success || !looksLikePdf) {
      return failure("Only PDF files within the configured size limit are supported.", [
        "The uploaded file failed validation."
      ]);
    }

    if (!process.env.OPENAI_API_KEY) {
      return failure(
        "OpenAI extraction is not configured.",
        ["Set OPENAI_API_KEY in your environment before extracting tender PDFs."],
        500
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extracted = await extractTextFromPdf(buffer);

    if (!isMeaningfulText(extracted.text)) {
      return failure(
        "Could not extract enough machine-readable text from the PDF.",
        ["This MVP uses text-based PDF parsing. OCR can be added as a later fallback for scanned PDFs."],
        422
      );
    }

    const tenderExtraction = await extractTenderFromText({
      text: extracted.text,
      fileName: file.name,
      pageCount: extracted.pages
    });

    return NextResponse.json(tenderExtraction);
  } catch (error) {
    if (isTenderExtractionError(error)) {
      console.error("Tender extraction failed", {
        message: error.message,
        status: error.status
      });

      return failure(error.message, error.warnings, error.status);
    }

    const message =
      error instanceof Error ? error.message : "Unexpected tender extraction failure.";

    console.error("Tender extraction route failed", error);

    return failure("The backend could not process the uploaded tender PDF.", [message], 500);
  }
}
