import { z } from "zod";

import { ArchitectureRepositoryError, ExportError } from "@/application/ports";
import { DomainError } from "@/domain/architecture";

import {
  CONTRACT_VERSION,
  type ErrorContract,
  type MutationSummary,
} from "./schemas";

export function validationErrorFromZod(
  error: z.ZodError,
  correlationId: string,
): ErrorContract {
  return {
    code: "VALIDATION_ERROR",
    message: "Input failed runtime validation.",
    fieldIssues: error.issues.map((issue) => ({
      path: issue.path.map((part) =>
        typeof part === "symbol" ? part.description ?? "symbol" : part,
      ),
      message: issue.message,
    })),
    retryable: false,
    correlationId,
  };
}

export function structuredError(
  error: unknown,
  correlationId: string,
): ErrorContract {
  if (error instanceof DomainError) {
    return {
      code:
        error.code === "ENTITY_NOT_FOUND"
          ? "NOT_FOUND"
          : error.code === "DUPLICATE_ID"
            ? "CONFLICT"
            : error.code,
      message: error.message,
      retryable: false,
      correlationId,
    };
  }
  if (error instanceof ArchitectureRepositoryError) {
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      correlationId,
    };
  }
  if (error instanceof ExportError) {
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      correlationId,
    };
  }
  if (error instanceof z.ZodError) {
    return validationErrorFromZod(error, correlationId);
  }
  return {
    code: "UNEXPECTED_ERROR",
    message: "An unexpected error occurred.",
    retryable: false,
    correlationId,
  };
}

export function successResult<T>(value: T, mutation?: MutationSummary) {
  return {
    ok: true as const,
    contractVersion: CONTRACT_VERSION,
    value,
    ...(mutation ? { mutation } : {}),
  };
}

export function errorResult(error: ErrorContract) {
  return {
    ok: false as const,
    contractVersion: CONTRACT_VERSION,
    error,
  };
}
