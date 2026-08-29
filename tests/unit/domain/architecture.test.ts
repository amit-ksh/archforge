import { describe, expect, it } from "vitest";

import type { ArchitectureCommand } from "@/application/commands";
import {
  DomainError,
  addComponent,
  addConstraint,
  addRequirement,
  clearArchitecture,
  connectComponents,
  createArchitecture,
  removeComponent,
  removeConnection,
  removeConstraint,
  removeRequirement,
  setCloudService,
  setProvider,
  setTechnology,
  updateArchitecture,
  updateComponent,
  updateConnection,
  updateConstraint,
  updateRequirement,
} from "@/domain/architecture";

const T0 = "2026-08-29T10:00:00.000Z";
const T1 = "2026-08-29T10:01:00.000Z";

function emptyArchitecture() {
  return createArchitecture(
    { id: "architecture-1", name: "Checkout", description: "Neutral design" },
    T0,
  );
}

function withComponent(
  architecture = emptyArchitecture(),
  id = "component-api",
  name = "Public API",
) {
  return addComponent(
    architecture,
    {
      id,
      capabilityId: "capability-api",
      name,
      description: "Accepts client requests",
      position: { x: 120, y: 80 },
      existingInfrastructure: false,
    },
    T1,
  );
}

function expectDomainError(action: () => unknown, code: DomainError["code"]) {
  expect(action).toThrowError(
    expect.objectContaining({ name: "DomainError", code }),
  );
}

describe("Architecture aggregate", () => {
  it("creates an empty, provider-neutral aggregate", () => {
    const architecture = emptyArchitecture();

    expect(architecture).toMatchObject({
      id: "architecture-1",
      name: "Checkout",
      revision: 0,
      requirements: [],
      constraints: [],
      components: [],
      connections: [],
      decisions: [],
      createdAt: T0,
      updatedAt: T0,
    });
  });

  it("updates metadata and clears design content while retaining identity", () => {
    const populated = withComponent();
    const renamed = updateArchitecture(
      populated,
      { name: "Payments", description: "Revised" },
      T1,
    );
    const cleared = clearArchitecture(renamed, T1);

    expect(cleared).toMatchObject({
      id: populated.id,
      name: "Payments",
      description: "Revised",
      components: [],
      revision: 3,
    });
  });

  it("adds, updates, and removes requirements without mutating prior state", () => {
    const original = emptyArchitecture();
    const added = addRequirement(
      original,
      {
        id: "requirement-latency",
        statement: "Keep API latency low",
        category: "performance",
        priority: "high",
        target: "p95 < 200 ms",
      },
      T1,
    );
    const updated = updateRequirement(
      added,
      "requirement-latency",
      { priority: "critical", target: null },
      T1,
    );
    const removed = removeRequirement(updated, "requirement-latency", T1);

    expect(original.requirements).toEqual([]);
    expect(added.requirements[0].priority).toBe("high");
    expect(updated.requirements[0]).toMatchObject({
      priority: "critical",
      target: null,
    });
    expect(removed.requirements).toEqual([]);
  });

  it("adds, updates, and removes hard constraints and preferences", () => {
    const added = addConstraint(
      emptyArchitecture(),
      {
        id: "constraint-provider",
        kind: "provider",
        statement: "Use the existing AWS organization",
        severity: "hard",
        value: "aws",
        source: "platform team",
      },
      T1,
    );
    const updated = updateConstraint(
      added,
      "constraint-provider",
      { severity: "preference", source: "architecture review" },
      T1,
    );

    expect(updated.constraints[0]).toMatchObject({
      severity: "preference",
      source: "architecture review",
    });
    expect(
      removeConstraint(updated, "constraint-provider", T1).constraints,
    ).toEqual([]);
  });

  it("adds and updates semantic components without vendor defaults", () => {
    const added = withComponent();
    const updated = updateComponent(
      added,
      "component-api",
      { name: "Edge API", position: { x: 240, y: 160 } },
      T1,
    );

    expect(added.components[0]).toMatchObject({
      capabilityId: "capability-api",
      technologyId: null,
      providerId: null,
      cloudServiceId: null,
    });
    expect(updated.components[0]).toMatchObject({
      name: "Edge API",
      position: { x: 240, y: 160 },
    });
    expect(added.components[0].name).toBe("Public API");
  });

  it("connects, updates, and removes valid component relationships", () => {
    const source = withComponent();
    const architecture = withComponent(source, "component-db", "Database");
    const connected = connectComponents(
      architecture,
      {
        id: "connection-api-db",
        sourceComponentId: "component-api",
        targetComponentId: "component-db",
        relationship: "data",
        label: "reads and writes",
      },
      T1,
    );
    const updated = updateConnection(
      connected,
      "connection-api-db",
      { relationship: "dependency", label: "depends on" },
      T1,
    );

    expect(updated.connections[0]).toMatchObject({
      relationship: "dependency",
      label: "depends on",
    });
    expect(removeConnection(updated, "connection-api-db", T1).connections).toEqual(
      [],
    );
  });

  it("rejects duplicate IDs, self-connections, and missing endpoints", () => {
    const source = withComponent();
    expectDomainError(
      () =>
        addRequirement(
          source,
          {
            id: "component-api",
            statement: "Duplicate ID",
            category: "other",
            priority: "low",
            target: null,
          },
          T1,
        ),
      "DUPLICATE_ID",
    );
    expectDomainError(
      () =>
        connectComponents(
          source,
          {
            id: "connection-self",
            sourceComponentId: "component-api",
            targetComponentId: "component-api",
            relationship: "dependency",
            label: "",
          },
          T1,
        ),
      "INVALID_CONNECTION",
    );
    expectDomainError(
      () =>
        connectComponents(
          source,
          {
            id: "connection-missing",
            sourceComponentId: "component-api",
            targetComponentId: "missing",
            relationship: "dependency",
            label: "",
          },
          T1,
        ),
      "INVALID_CONNECTION",
    );
  });

  it("removes a component and its connections without changing the input", () => {
    const source = withComponent();
    const architecture = withComponent(source, "component-db", "Database");
    const connected = connectComponents(
      architecture,
      {
        id: "connection-api-db",
        sourceComponentId: "component-api",
        targetComponentId: "component-db",
        relationship: "data",
        label: "data access",
      },
      T1,
    );
    const removed = removeComponent(connected, "component-db", T1);

    expect(removed.components.map(({ id }) => id)).toEqual(["component-api"]);
    expect(removed.connections).toEqual([]);
    expect(connected.components).toHaveLength(2);
    expect(connected.connections).toHaveLength(1);
  });

  it("resolves technology, provider, and service independently and explicitly", () => {
    const component = withComponent();
    const technology = setTechnology(
      component,
      "component-api",
      "technology-node",
      T1,
    );
    const provider = setProvider(
      technology,
      "component-api",
      "provider-aws",
      T1,
    );
    const service = setCloudService(
      provider,
      "component-api",
      "service-lambda",
      T1,
    );
    const changedProvider = setProvider(
      service,
      "component-api",
      "provider-azure",
      T1,
    );

    expect(service.components[0]).toMatchObject({
      technologyId: "technology-node",
      providerId: "provider-aws",
      cloudServiceId: "service-lambda",
    });
    expect(changedProvider.components[0]).toMatchObject({
      technologyId: "technology-node",
      providerId: "provider-azure",
      cloudServiceId: null,
    });
    expect(
      setTechnology(changedProvider, "component-api", null, T1).components[0],
    ).toMatchObject({ technologyId: null, providerId: "provider-azure" });
  });

  it("requires a provider before setting a cloud service", () => {
    expectDomainError(
      () =>
        setCloudService(
          withComponent(),
          "component-api",
          "service-functions",
          T1,
        ),
      "INVALID_RESOLUTION",
    );
  });

  it("rejects missing entities and invalid text without partial mutation", () => {
    const architecture = withComponent();
    expectDomainError(
      () => updateComponent(architecture, "missing", { name: "Nope" }, T1),
      "ENTITY_NOT_FOUND",
    );
    expectDomainError(
      () => updateArchitecture(architecture, { name: "   " }, T1),
      "INVALID_ARCHITECTURE",
    );
    expect(architecture.name).toBe("Checkout");
    expect(architecture.revision).toBe(1);
  });
});

describe("Architecture commands", () => {
  it("exposes every required mutation as a discriminated command", () => {
    const commands = [
      { type: "architecture.create", input: { id: "a", name: "A" } },
      { type: "architecture.update", architectureId: "a", patch: {} },
      { type: "architecture.clear", architectureId: "a" },
      {
        type: "requirement.add",
        architectureId: "a",
        requirement: {
          id: "r",
          statement: "Reliable",
          category: "reliability",
          priority: "high",
          target: null,
        },
      },
      {
        type: "requirement.update",
        architectureId: "a",
        requirementId: "r",
        patch: {},
      },
      { type: "requirement.remove", architectureId: "a", requirementId: "r" },
      {
        type: "component.add",
        architectureId: "a",
        component: {
          id: "c",
          capabilityId: "api",
          name: "API",
          description: "",
          position: { x: 0, y: 0 },
          existingInfrastructure: false,
        },
      },
      { type: "component.update", architectureId: "a", componentId: "c", patch: {} },
      { type: "component.remove", architectureId: "a", componentId: "c" },
      {
        type: "connection.connect",
        architectureId: "a",
        connection: {
          id: "edge",
          sourceComponentId: "c",
          targetComponentId: "d",
          relationship: "dependency",
          label: "",
        },
      },
      {
        type: "connection.update",
        architectureId: "a",
        connectionId: "edge",
        patch: {},
      },
      { type: "connection.remove", architectureId: "a", connectionId: "edge" },
      {
        type: "resolution.set-technology",
        architectureId: "a",
        componentId: "c",
        technologyId: null,
      },
      {
        type: "resolution.set-provider",
        architectureId: "a",
        componentId: "c",
        providerId: null,
      },
      {
        type: "resolution.set-cloud-service",
        architectureId: "a",
        componentId: "c",
        cloudServiceId: null,
      },
    ] satisfies readonly ArchitectureCommand[];

    expect(new Set(commands.map(({ type }) => type))).toHaveLength(15);
  });
});
