import { NextResponse } from "next/server";
import { z } from "zod";
import { extractTextFromPdf, isMeaningfulText } from "@/lib/pdf/extract-text";
import {
  normalizeExtractionFailure,
  normalizeExtractionSuccess
} from "@/lib/pdf/normalize-response";
import { mockOcrFallback } from "@/lib/pdf/mock-ocr";
import { summarizeStructuredData } from "@/lib/pdf/summarize-structured-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uploadSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  size: z.number().positive().max(15 * 1024 * 1024)
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        normalizeExtractionFailure({
          name: "unknown.pdf",
          message: "No PDF file was provided.",
          warnings: ["Upload a valid PDF file and try again."]
        }),
        { status: 400 }
      );
    }

    const fileInput = uploadSchema.safeParse({
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size
    });

    const looksLikePdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!fileInput.success || !looksLikePdf) {
      return NextResponse.json(
        normalizeExtractionFailure({
          name: file.name || "unknown.pdf",
          message: "Only PDF files are supported for extraction.",
          warnings: ["The uploaded file failed validation."]
        }),
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extracted = await extractTextFromPdf(buffer);

    if (!isMeaningfulText(extracted.text)) {
      const mockOcr = await mockOcrFallback(file.name);

      if (mockOcr.text && isMeaningfulText(mockOcr.text)) {
        const ocrSummary = summarizeStructuredData(mockOcr.text);

        return NextResponse.json(
          normalizeExtractionSuccess({
            name: file.name,
            pages: extracted.pages,
            type: ocrSummary.documentType,
            sourceType: "ocr_fallback",
            summary: `${ocrSummary.summary} OCR fallback architecture was used as a placeholder path.`,
            confidence: Math.max(ocrSummary.confidence - 0.08, 0.3),
            structuredData: ocrSummary.structuredData,
            rawText: mockOcr.text,
            warnings: [...ocrSummary.warnings, mockOcr.warning, ...ocrSummary.classification.reasons],
            missingFields: ocrSummary.missingFields,
            parser: mockOcr.provider,
            ocrUsed: false,
            status: "partial_success"
          })
        );
      }

      if (extracted.text.trim().length > 0) {
        const partialSummary = summarizeStructuredData(extracted.text);

        return NextResponse.json(
          normalizeExtractionSuccess({
            name: file.name,
            pages: extracted.pages,
            type: partialSummary.documentType,
            sourceType: "scanned_pdf",
            summary: `${partialSummary.summary} The extracted text was limited, so OCR is likely needed for higher fidelity.`,
            confidence: Math.max(partialSummary.confidence - 0.2, 0.25),
            structuredData: partialSummary.structuredData,
            rawText: extracted.text,
            warnings: [
              ...partialSummary.warnings,
              ...partialSummary.classification.reasons,
              "The PDF appears to contain limited machine-readable text.",
              mockOcr.warning
            ],
            missingFields: partialSummary.missingFields,
            status: "partial_success"
          })
        );
      }

      return NextResponse.json(
        normalizeExtractionFailure({
          name: file.name,
          pages: extracted.pages,
          sourceType: "scanned_pdf",
          message: "Could not extract enough usable content from the PDF.",
          confidence: 0.2,
          warnings: ["OCR may be required for scanned documents.", mockOcr.warning]
        }),
        { status: 422 }
      );
    }

    const summary = summarizeStructuredData(extracted.text);

    return NextResponse.json(
      normalizeExtractionSuccess({
        name: file.name,
        pages: extracted.pages,
        type: summary.documentType,
        sourceType: "text_pdf",
        summary: summary.summary,
        confidence: summary.confidence,
        structuredData: summary.structuredData,
        rawText: extracted.text,
        warnings: [...summary.warnings, ...summary.classification.reasons],
        missingFields: summary.missingFields
      })
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected PDF extraction failure.";

    return NextResponse.json(
      normalizeExtractionFailure({
        name: "unknown.pdf",
        message: "The backend could not process the uploaded PDF.",
        warnings: [message]
      }),
      { status: 500 }
    );
  }
}
