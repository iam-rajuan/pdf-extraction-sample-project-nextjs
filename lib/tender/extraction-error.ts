export class TenderExtractionError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly warnings: string[] = []
  ) {
    super(message);
    this.name = "TenderExtractionError";
  }
}

export function isTenderExtractionError(error: unknown): error is TenderExtractionError {
  return error instanceof TenderExtractionError;
}
