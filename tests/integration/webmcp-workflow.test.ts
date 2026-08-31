import { describe, expect, it } from "vitest";

import { ToolResultSchema, type ToolResult } from "@/application/contracts";
import type { Clock, IdGenerator } from "@/application/ports";
import {
  ArchitectureCommandService,
  ArchitectureService,
  DesignSystemWorkflowService,
  ResolutionService,
  ValidationService,
} from "@/application/services";
import { ResolutionEngine } from "@/domain/resolution";
import { ValidationEngine } from "@/domain/validation";
import { ActivityStore } from "@/features/activity";
import {
  ArchitectureExportEngine,
  InMemoryArchitectureRepository,
  StaticComponentCatalog,
  StaticProviderCatalog,
} from "@/infrastructure";
import {
  createAnalysisExportTools,
  createDesignSystemToolSet,
  registerWebMcpTools,
  type WebMcpBrowserTool,
  type WebMcpModelContext,
} from "@/webmcp";

class SequenceClock implements Clock {
  private tick = 0;

  now(): string {
    const value = new Date(Date.UTC(2026, 0, 1, 0, 0, this.tick));
    this.tick += 1;
    return value.toISOString();
  }
}

class SequenceIds implements IdGenerator {
  private readonly counters = new Map<string, number>();

  next(prefix: string): string {
    const next = (this.counters.get(prefix) ?? 0) + 1;
    this.counters.set(prefix, next);
    return `${prefix}-${next}`;
  }
}

function createHarness() {
  const repository = new InMemoryArchitectureRepository();
  const clock = new SequenceClock();
  const idGenerator = new SequenceIds();
  const componentCatalog = new StaticComponentCatalog();
  const providerCatalog = new StaticProviderCatalog(undefined, componentCatalog);
  const resolutionEngine = new ResolutionEngine(
    componentCatalog,
    providerCatalog,
  );
  const architectureService = new ArchitectureService(
    repository,
    clock,
    idGenerator,
  );
  const commandService = new ArchitectureCommandService(repository, clock);
  const resolutionService = new ResolutionService(
    repository,
    clock,
    resolutionEngine,
  );
  const validationService = new ValidationService(
    repository,
    new ValidationEngine(componentCatalog, providerCatalog, resolutionEngine),
  );
  const exporter = new ArchitectureExportEngine();
  const activityStore = new ActivityStore();
  const designSystemWorkflowService = new DesignSystemWorkflowService({
    architectureService,
    commandService,
    resolutionService,
    validationService,
    componentCatalog,
    providerCatalog,
    resolutionEngine,
    idGenerator,
    clock,
    activitySink: activityStore,
  });
  const registered = new Map<string, WebMcpBrowserTool>();
  const modelContext: WebMcpModelContext = {
    async registerTool(tool) {
      registered.set(tool.name, tool);
    },
    async getTools() {
      return [];
    },
    async executeTool() {
      throw new Error("The integration harness executes registered tools directly.");
    },
  };
  const dependencies = {
    architectureService,
    commandService,
    componentCatalog,
    idGenerator,
    resolutionService,
    validationService,
    exporter,
    designSystemWorkflowService,
  };

  return {
    activityStore,
    clock,
    definitions: [
      ...createDesignSystemToolSet(dependencies),
      ...createAnalysisExportTools(dependencies),
    ],
    exporter,
    idGenerator,
    modelContext,
    registered,
    repository,
  };
}

async function invoke(
  registered: ReadonlyMap<string, WebMcpBrowserTool>,
  name: string,
  input: object,
): Promise<ToolResult> {
  const tool = registered.get(name);
  if (!tool) throw new Error(`Tool '${name}' was not registered.`);
  return ToolResultSchema.parse(
    await tool.execute(input, { signal: new AbortController().signal }),
  );
}

const validDesignRequest = {
  contractVersion: 1 as const,
  requestId: "integration-design",
  payload: {
    metadata: {
      name: "Checkout platform",
      description: "A neutral checkout design used by integration coverage.",
    },
    requirements: [
      {
        key: "availability",
        statement: "Checkout must remain available during a zonal failure.",
        category: "reliability" as const,
        priority: "critical" as const,
        target: "99.95% monthly availability",
      },
    ],
    constraints: [
      {
        key: "team-skill",
        kind: "skill" as const,
        statement: "The team operates TypeScript services.",
        severity: "preference" as const,
        value: ["typescript", "nodejs"],
        source: "engineering profile",
      },
    ],
    components: [
      {
        key: "checkout-api",
        capabilityId: "capability-api",
        name: "Checkout API",
        position: { x: 120, y: 120 },
      },
      {
        key: "orders-db",
        capabilityId: "capability-relational-database",
        name: "Orders database",
        position: { x: 480, y: 120 },
      },
    ],
    connections: [
      {
        key: "api-orders",
        sourceComponentKey: "checkout-api",
        targetComponentKey: "orders-db",
        relationship: "data" as const,
        label: "stores orders",
      },
    ],
    resolutions: [
      {
        componentKey: "checkout-api",
        technologyId: "technology-nodejs",
        providerId: "provider-aws",
        cloudServiceId: "service-aws-fargate",
      },
    ],
  },
};

describe("WebMCP workflow integration", () => {
  it("persists a canonical design and exports the same validated snapshot", async () => {
    const harness = createHarness();
    const registration = await registerWebMcpTools(harness.definitions, {
      clock: harness.clock,
      idGenerator: harness.idGenerator,
      activitySink: harness.activityStore,
      modelContext: harness.modelContext,
    });

    expect(registration.result.supported).toBe(true);
    expect(registration.result.registeredNames).toContain("design_system");

    const result = await invoke(
      harness.registered,
      "design_system",
      validDesignRequest,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);

    const output = result.value as {
      architectureId: string;
      finalRevision: number;
      unresolvedDecisions: readonly { level: string }[];
    };
    expect(result.mutation).toMatchObject({
      behavior: "mutation",
      architectureId: output.architectureId,
      revision: output.finalRevision,
    });

    const persisted = await harness.repository.get(output.architectureId);
    expect(persisted).not.toBeNull();
    expect(persisted?.requirements).toHaveLength(1);
    expect(persisted?.components).toHaveLength(2);
    expect(persisted?.connections).toHaveLength(1);
    expect(persisted?.components[0]).toMatchObject({
      technologyId: "technology-nodejs",
      providerId: "provider-aws",
      cloudServiceId: "service-aws-fargate",
    });
    expect(output.unresolvedDecisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ level: "technology" }),
        expect.objectContaining({ level: "provider" }),
      ]),
    );

    const serialized = JSON.stringify(persisted);
    expect(serialized).not.toContain("activity");
    expect(serialized).not.toContain("selection");
    expect(serialized).not.toContain("viewport");

    const exported = await invoke(harness.registered, "export_json", {
      contractVersion: 1,
      requestId: "integration-export",
      payload: { architectureId: output.architectureId },
    });
    expect(exported.ok).toBe(true);
    if (!exported.ok) throw new Error(exported.error.message);
    const exportValue = exported.value as {
      data: string;
      encoding: string;
      mediaType: string;
    };
    expect(exportValue).toMatchObject({
      encoding: "utf-8",
      mediaType: "application/json",
    });
    expect(JSON.parse(exportValue.data)).toMatchObject({
      id: output.architectureId,
      revision: output.finalRevision,
    });
    expect(harness.activityStore.getSnapshot()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ toolName: "design_system", status: "succeeded" }),
        expect.objectContaining({ toolName: "export_json", status: "succeeded" }),
      ]),
    );

    registration.registrar.dispose();
    harness.exporter.dispose();
  });

  it("rejects invalid designs before writes and exposes a structured failed activity", async () => {
    const harness = createHarness();
    const registration = await registerWebMcpTools(harness.definitions, {
      clock: harness.clock,
      idGenerator: harness.idGenerator,
      activitySink: harness.activityStore,
      modelContext: harness.modelContext,
    });

    const result = await invoke(harness.registered, "design_system", {
      ...validDesignRequest,
      requestId: "integration-invalid",
      payload: {
        ...validDesignRequest.payload,
        components: [
          {
            key: "missing-capability",
            capabilityId: "capability-not-in-catalog",
            name: "Invalid component",
          },
        ],
        connections: [],
        resolutions: [],
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected the invalid workflow to fail.");
    expect(result.error).toMatchObject({
      code: "VALIDATION_ERROR",
      correlationId: "integration-invalid",
      details: { phase: "preflight", writesApplied: 0 },
    });
    expect(await harness.repository.list()).toHaveLength(0);
    expect(harness.activityStore.getSnapshot()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          correlationId: "integration-invalid",
          status: "failed",
          toolName: "design_system",
        }),
      ]),
    );

    registration.registrar.dispose();
    harness.exporter.dispose();
  });
});
