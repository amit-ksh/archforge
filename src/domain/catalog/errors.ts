export class CatalogInitializationError extends Error {
  readonly code = "CATALOG_INITIALIZATION_ERROR" as const;

  constructor(
    message: string,
    readonly recordPath: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "CatalogInitializationError";
  }
}
