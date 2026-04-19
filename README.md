# PDF Extraction Platform MVP

Backend-first PDF extraction MVP built with Next.js App Router, TypeScript, Tailwind CSS, and a real server-side extraction route.

## Purpose

This project demonstrates a production-style MVP for uploading PDFs, extracting content on the backend, normalizing the result, and rendering a flexible review interface on the frontend.

It is intentionally lean:

- No authentication
- No billing
- No database
- No file persistence
- No fake frontend-only extraction flow

## Stack

- Next.js 15+ with App Router
- TypeScript
- Tailwind CSS
- Node.js runtime API route
- `pdf-parse` for backend PDF text extraction
- Zod for validation and response parsing
- Minimal React state for UI flow

## Features

- PDF-only upload validation
- In-memory multipart upload handling
- Backend extraction via `POST /api/extract-pdf`
- Text-based PDF parsing with `pdf-parse`
- OCR-ready fallback architecture for scanned or low-text PDFs
- Normalized extraction response contract
- Heuristic document-type detection
- Generic field extraction
- Dynamic section and table detection
- Dynamic frontend rendering for variable schemas
- Raw text and raw JSON inspection
- Warnings, missing fields, confidence, and processing metadata
- Reset flow for repeat uploads

## Folder Structure

```text
app/
  api/
    extract-pdf/
      route.ts
  globals.css
  layout.tsx
  page.tsx
components/
  action-bar.tsx
  empty-state.tsx
  error-state.tsx
  extracted-text-viewer.tsx
  extraction-overview.tsx
  file-info.tsx
  file-upload.tsx
  loader.tsx
  raw-json-viewer.tsx
  result-tabs.tsx
  section-renderer.tsx
  status-badge.tsx
  structured-data-renderer.tsx
  summary-card.tsx
  table-renderer.tsx
  warning-panel.tsx
lib/
  constants/
    extraction-status.ts
  pdf/
    detect-document-type.ts
    extract-text.ts
    mock-ocr.ts
    normalize-response.ts
    summarize-structured-data.ts
  schemas/
    extraction-response.ts
  utils/
    format-bytes.ts
    format-confidence.ts
    object-helpers.ts
    safe-json.ts
types/
  extraction.ts
README.md
next.config.ts
next-env.d.ts
package.json
postcss.config.mjs
tailwind.config.ts
tsconfig.json
```

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Build and Verification

```bash
npm run typecheck
npm run build
```

## Extraction Flow

1. User selects a PDF in the frontend.
2. The browser sends the file as `multipart/form-data` to `POST /api/extract-pdf`.
3. The API route validates the upload and reads the file into memory.
4. `pdf-parse` extracts machine-readable text from the PDF.
5. The backend evaluates text quality with `isMeaningfulText`.
6. If text quality is weak, the route returns a partial or failed response and exposes the OCR upgrade path.
7. If text is usable, the backend:
   - detects the likely document type
   - extracts generic and type-relevant fields
   - builds sections from content blocks
   - attempts table detection
   - generates a summary
   - computes warnings, missing fields, and confidence
8. The backend normalizes everything into one stable response shape.
9. The frontend renders the normalized response dynamically.

## Why Backend Extraction Instead of Frontend-Only Parsing

PDF extraction is more reliable on the backend because:

- parsing libraries such as `pdf-parse` are designed for Node execution
- large files and parser failures are easier to control server-side
- OCR providers are almost always backend integrations
- normalization, validation, and structured extraction belong in a trusted server layer
- the frontend should render a stable contract, not parser internals

## Heuristics Used

Current MVP heuristics are intentionally generic, not invoice-only:

- weighted document type detection for resumes, invoices, receipts, contracts, reports, forms, strategy documents, proposals, and unknown documents
- key-value line extraction from patterns like `Field: Value`
- type-specific extraction branches for resume, invoice, receipt, contract, report, form, strategy, and proposal documents
- invoice-like field matching for invoice number and totals
- vendor, merchant, customer, and counterparty candidate extraction
- resume contact, skills, experience, and education promotion
- date and currency amount detection
- simple title inference from leading content
- section creation from block segmentation
- lightweight table detection from multi-column text lines
- missing-field inference based on detected document type

## OCR-Ready Architecture

The current extraction pipeline uses `pdf-parse` first and keeps OCR as an extension point.

Relevant files:

- `lib/pdf/extract-text.ts`
- `lib/pdf/mock-ocr.ts`
- `app/api/extract-pdf/route.ts`

Today:

- low-text PDFs return partial or failed responses
- warnings explicitly indicate OCR may be required
- `mockOcrFallback` marks the future provider integration point

To integrate real OCR later, replace the mock fallback with a provider adapter for:

- Tesseract
- AWS Textract
- Google Document AI
- Azure Form Recognizer

The API route and frontend do not need a redesign if the provider returns normalized text or structured OCR output that is mapped through the existing normalization layer.

## Current Limitations

- No persistent file storage
- No async job queue for large documents
- No OCR provider wired yet
- Heuristics are intentionally lightweight and not domain-perfect
- Complex scanned layouts and deeply nested tables will need stronger OCR and extraction logic
- No document versioning, audit trail, or review workflow

## Production Improvements

- Add real OCR provider selection and retry logic
- Add background processing for large files
- Persist extraction jobs and documents in cloud storage
- Add auth and team workspaces
- Add schema templates per document family
- Add LLM-assisted normalization with confidence gating
- Add observability, tracing, and extraction metrics
- Add file size and rate limiting controls
- Add document comparison and human correction workflows
