export type DomainErrorCode =
  | "DUPLICATE_ID"
  | "ENTITY_NOT_FOUND"
  | "INVALID_ARCHITECTURE"
  | "INVALID_COMPONENT"
  | "INVALID_CONNECTION"
  | "INVALID_REQUIREMENT"
  | "INVALID_CONSTRAINT"
  | "INVALID_RESOLUTION"
  | "INCOMPATIBLE_SELECTION";

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(
    code: DomainErrorCode,
    message: string,
    details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.details = details;
  }
}
