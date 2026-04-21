# South African Tender Extraction POC

Next.js App Router proof of concept for real upload and structured extraction from South African government tender PDFs.

The app accepts real PDF uploads, extracts machine-readable text on the server, preprocesses tender content, calls OpenAI for schema-aware extraction, validates the output with Zod, normalizes values, and renders the final JSON in the browser.

## Stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- `pdf-parse` for server-side PDF text extraction
- OpenAI SDK for structured extraction
- Zod for strict schema validation

## Environment

Create `.env.local` from `.env.example`:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1
MAX_FILE_SIZE_MB=20
```

`OPENAI_API_KEY` is required for extraction. The API route fails gracefully if it is missing.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verify

```bash
npm run typecheck
npm run build
```

## Extraction Flow

1. Upload a PDF in the browser.
2. `POST /api/extract-pdf` validates file type and size.
3. `pdf-parse` extracts machine-readable text and captures page text where available.
4. Tender preprocessing cleans text, detects common tender labels, and chunks long documents.
5. OpenAI maps each chunk into the strict tender schema.
6. Chunk results are merged, deduplicated, normalized, and validated with Zod.
7. The frontend renders the same structured schema and provides copy/download JSON actions.

## Output Schema

Successful extraction returns one consistent top-level tender JSON object with:

- `document_info`
- `tender_metadata`
- `contact_details`
- `compliance_requirements`
- `sbd_forms_detected`
- `returnable_documents`
- `technical_scope`
- `raw_supporting_sections`

Unavailable values remain `null`, `false`, or empty arrays as appropriate.

## Important Scope

This phase is extraction and structuring only. It does not implement bidder scoring, ranking, comparison, or evaluation dashboards.

## Current Limitations

- Scanned PDFs require OCR, which is not wired in this phase.
- Large files are processed synchronously in the API route.
- No database, persistence, audit trail, authentication, or job queue.
