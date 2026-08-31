import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  ArchitectureSchema,
  CONTRACT_VERSION,
  ErrorSchema,
  ExportResultSchema,
  ToolResultSchema,
  createToolInputSchema,
  createToolResultSchema,
  errorResult,
  parseArchitectureContract,
  safeParseArchitectureContract,
  structuredError,
  successResult,
  toArchitectureContract,
} from "@/application/contracts";
import {
  DomainError,
  addComponent,
  addConstraint,
  addRequirement,
  connectComponents,
  createArchitecture,
  setProvider,
} from "@/domain/architecture";

const CREATED_AT = "2026-08-29T10:00:00.000Z";
const UPDATED_AT = "2026-08-29T10:01:00.000Z";

function architectureFixture() {
  let architecture = createArchitecture(
    { id: "architecture-1", name: "Orders", description: "Order processing" },
    CREATED_AT,
  );
  architecture = addRequirement(
    architecture,
    {
      id: "requirement-1",
      statement: "Survive a zone failure",
      category: "reliability",
      priority: "critical",
      target: "RTO under 5 minutes",
    },
    UPDATED_AT,
  );
  architecture = addConstraint(
    architecture,
    {
      id: "constraint-1",
      kind: "operational",
      statement: "Prefer managed services",
      severity: "preference",
      value: true,
      source: "platform team",
    },
    UPDATED_AT,
  );
  architecture = addComponent(
    architecture,
    {
      id: "component-api",
      capabilityId: "capability-api",
      name: "Orders API",
      description: "Receives orders",
      position: { x: 10, y: 20 },
      existingInfrastructure: false,
    },
    UPDATED_AT,
  );
  architecture = addComponent(
    architecture,
    {
      id: "component-database",
      capabilityId: "capability-database",
      name: "Orders database",
      description: "Stores orders",
      position: { x: 260, y: 20 },
      existingInfrastructure: true,
    },
    UPDATED_AT,
  );
  architecture = connectComponents(
    architecture,
    {
      id: "connection-api-db",
      sourceComponentId: "component-api",
      targetComponentId: "component-database",
      relationship: "data",
      label: "persists",
    },
    UPDATED_AT,
  );
  return setProvider(
    architecture,
    "component-api",
    "provider-aws",
    UPDATED_AT,
  );
}

describe("architecture contracts", () => {
  it("round-trips every canonical architecture field", () => {
    const architecture = architectureFixture();
    const contract = toArchitectureContract(architecture);

    expect(contract.schemaVersion).toBe(CONTRACT_VERSION);
    expect(parseArchitectureContract(contract)).toEqual(architecture);
    expect(ArchitectureSchema.parse(contract)).toEqual(contract);
  });

  it("rejects unknown keys, malformed IDs, invalid dates, and discriminants", () => {
    const contract = toArchitectureContract(architectureFixture());

    expect(
      safeParseArchitectureContract({ ...contract, surprise: true }).success,
    ).toBe(false);
    expect(
      safeParseArchitectureContract({ ...contract, id: "bad id" }).success,
    ).toBe(false);
    expect(
      safeParseArchitectureContract({ ...contract, createdAt: "yesterday" })
        .success,
    ).toBe(false);
    expect(
      safeParseArchitectureContract({ ...contract, schemaVersion: 2 }).success,
    ).toBe(false);
  });

  it("rejects invalid nested records before domain hydration", () => {
    const contract = toArchitectureContract(architectureFixture());
    const invalid = {
      ...contract,
      components: [
        { ...contract.components[0], position: { x: Number.NaN, y: 10 } },
      ],
    };

    expect(() => parseArchitectureContract(invalid)).toThrow();
  });
});

describe("tool and error contracts", () => {
  const RequestSchema = createToolInputSchema(
    z.strictObject({ architectureId: z.string().min(1) }),
  );
  const ResultSchema = createToolResultSchema(
    z.strictObject({ architectureId: z.string().min(1) }),
  );

  it("validates strict tool input and exact success/error envelopes", () => {
    expect(
      RequestSchema.parse({
        contractVersion: CONTRACT_VERSION,
        payload: { architectureId: "architecture-1" },
      }),
    ).toBeDefined();
    expect(() =>
      RequestSchema.parse({
        contractVersion: CONTRACT_VERSION,
        payload: { architectureId: "architecture-1", extra: true },
      }),
    ).toThrow();

    const success = successResult({ architectureId: "architecture-1" });
    expect(ResultSchema.parse(success)).toEqual(success);

    const failure = errorResult({
      code: "NOT_FOUND",
      message: "Architecture was not found.",
      retryable: false,
      correlationId: "correlation-1",
    });
    expect(ResultSchema.parse(failure)).toEqual(failure);
    expect(ToolResultSchema.parse(failure)).toEqual(failure);
  });

  it("maps schema failures to field paths and sanitizes unknown errors", () => {
    const parseFailure = RequestSchema.safeParse({
      contractVersion: CONTRACT_VERSION,
      payload: {},
    });
    expect(parseFailure.success).toBe(false);
    if (parseFailure.success) return;

    const validationError = structuredError(
      parseFailure.error,
      "correlation-validation",
    );
    expect(ErrorSchema.parse(validationError)).toMatchObject({
      code: "VALIDATION_ERROR",
      correlationId: "correlation-validation",
      retryable: false,
    });
    expect(validationError.fieldIssues?.[0].path).toEqual([
      "payload",
      "architectureId",
    ]);

    expect(structuredError(new Error("secret"), "correlation-unknown")).toEqual({
      code: "UNEXPECTED_ERROR",
      message: "An unexpected error occurred.",
      retryable: false,
      correlationId: "correlation-unknown",
    });
  });

  it("preserves known domain error codes without leaking details", () => {
    const error = structuredError(
      new DomainError("ENTITY_NOT_FOUND", "Component 'c' was not found.", {
        internal: "not serialized",
      }),
      "correlation-domain",
    );

    expect(ErrorSchema.parse(error)).toEqual({
      code: "NOT_FOUND",
      message: "Component 'c' was not found.",
      retryable: false,
      correlationId: "correlation-domain",
    });
  });

  it("validates export metadata and rejects mismatched media types", () => {
    expect(
      ExportResultSchema.parse({
        format: "svg",
        filename: "orders.svg",
        mediaType: "image/svg+xml",
        encoding: "utf-8",
        data: "<svg />",
        size: 7,
        warnings: [],
      }),
    ).toBeDefined();
    expect(() =>
      ExportResultSchema.parse({
        format: "pdf",
        filename: "orders.pdf",
        mediaType: "application/pdf",
        encoding: "base64",
        data: "",
        size: 0,
        warnings: [],
      }),
    ).toThrow();
  });
});
