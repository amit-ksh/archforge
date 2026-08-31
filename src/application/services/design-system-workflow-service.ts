import {
  WorkflowError,
  type ValidationIssue,
  type WebMcpActivityEvent,
  type WebMcpActivitySink,
  type WebMcpToolBehavior,
} from "@/application/contracts";
import type { Clock, IdGenerator } from "@/application/ports";
import {
  addComponent,
  addConstraint,
  addRequirement,
  connectComponents,
  createArchitecture,
  setCloudService,
  setProvider,
  setTechnology,
  type Architecture,
  type ConnectionRelationship,
  type ConstraintKind,
  type ConstraintSeverity,
  type ConstraintValue,
  type EntityId,
  type Position,
  type RequirementCategory,
  type RequirementPriority,
} from "@/domain/architecture";
import type { ComponentCatalog, ProviderCatalog } from "@/domain/catalog";
import type { ResolutionEngine } from "@/domain/resolution";

import type { ArchitectureCommandService } from "./architecture-command-service";
import type { ArchitectureService } from "./architecture-service";
import type { ResolutionService } from "./resolution-service";
import type { ValidationService } from "./validation-service";

export interface DesignSystemRequirementInput {
  readonly key: string;
  readonly statement: string;
  readonly category: RequirementCategory;
  readonly priority: RequirementPriority;
  readonly target?: string;
}

export interface DesignSystemConstraintInput {
  readonly key: string;
  readonly kind: ConstraintKind;
  readonly statement: string;
  readonly severity: ConstraintSeverity;
  readonly value?: ConstraintValue;
  readonly source?: string;
}

export interface DesignSystemProviderPreferenceInput {
  readonly key: string;
  readonly providerId: EntityId;
  readonly rationale?: string;
}

export interface DesignSystemComponentInput {
  readonly key: string;
  readonly capabilityId: EntityId;
  readonly name: string;
  readonly description?: string;
  readonly position?: Position;
  readonly existingInfrastructure?: boolean;
}

export interface DesignSystemConnectionInput {
  readonly key: string;
  readonly sourceComponentKey: string;
  readonly targetComponentKey: string;
  readonly relationship: ConnectionRelationship;
  readonly label?: string;
}

export interface DesignSystemResolutionInput {
  readonly componentKey: string;
  readonly technologyId?: EntityId;
  readonly providerId?: EntityId;
  readonly cloudServiceId?: EntityId;
}

export interface DesignSystemWorkflowRequest {
  readonly metadata: {
    readonly name: string;
    readonly description?: string;
  };
  readonly requirements: readonly DesignSystemRequirementInput[];
  readonly constraints: readonly DesignSystemConstraintInput[];
  readonly providerPreference?: DesignSystemProviderPreferenceInput;
  readonly components: readonly DesignSystemComponentInput[];
  readonly connections: readonly DesignSystemConnectionInput[];
  readonly resolutions: readonly DesignSystemResolutionInput[];
}

export type DesignSystemEntityKind =
  | "architecture"
  | "requirement"
  | "constraint"
  | "component"
  | "connection";

export interface DesignSystemIdCorrelation {
  readonly kind: DesignSystemEntityKind;
  readonly key: string;
  readonly id: EntityId;
}

export interface DesignSystemExecutedStep {
  readonly key: string;
  readonly summary: string;
  readonly affectedIds: readonly EntityId[];
  readonly revision: number;
}

export interface DesignSystemUnresolvedDecision {
  readonly componentId: EntityId;
  readonly componentKey: string;
  readonly level: "technology" | "provider" | "cloud-service";
  readonly reason: string;
}

export interface DesignSystemWorkflowResult {
  readonly architectureId: EntityId;
  readonly finalRevision: number;
  readonly executedSteps: readonly DesignSystemExecutedStep[];
  readonly idCorrelations: readonly DesignSystemIdCorrelation[];
  readonly affectedIds: readonly EntityId[];
  readonly validationIssues: readonly ValidationIssue[];
  readonly unresolvedDecisions: readonly DesignSystemUnresolvedDecision[];
}

interface PreparedWorkflow {
  readonly architectureId: EntityId;
  readonly ids: ReadonlyMap<string, EntityId>;
  readonly idCorrelations: readonly DesignSystemIdCorrelation[];
}

interface StepResult {
  readonly summary: string;
  readonly affectedIds: readonly EntityId[];
  readonly revision: number;
}

export interface DesignSystemWorkflowDependencies {
  readonly architectureService: ArchitectureService;
  readonly commandService: ArchitectureCommandService;
  readonly resolutionService: ResolutionService;
  readonly validationService: ValidationService;
  readonly componentCatalog: ComponentCatalog;
  readonly providerCatalog: ProviderCatalog;
  readonly resolutionEngine: ResolutionEngine;
  readonly idGenerator: IdGenerator;
  readonly clock: Clock;
  readonly activitySink: WebMcpActivitySink;
}

function generatedKey(kind: DesignSystemEntityKind, key: string): string {
  return `${kind}:${key}`;
}

function requirePreparedId(
  prepared: PreparedWorkflow,
  kind: DesignSystemEntityKind,
  key: string,
): EntityId {
  const id = prepared.ids.get(generatedKey(kind, key));
  if (!id) {
    throw new WorkflowError("VALIDATION_ERROR", "Workflow ID correlation failed.", {
      phase: "preflight",
      issues: [{ path: `${kind}.${key}`, message: "No canonical ID was prepared." }],
    });
  }
  return id;
}

function resolutionIssue(
  componentKey: string,
  level: string,
  message: string,
) {
  return {
    path: `resolutions.${componentKey}.${level}`,
    message,
  };
}

export class DesignSystemWorkflowService {
  constructor(private readonly dependencies: DesignSystemWorkflowDependencies) {}

  async execute(
    request: DesignSystemWorkflowRequest,
    correlationId: string,
  ): Promise<DesignSystemWorkflowResult> {
    const prepared = await this.preflight(request);
    const completedSteps: DesignSystemExecutedStep[] = [];
    const affectedIds: EntityId[] = [];
    const complete = (
      key: string,
      summary: string,
      stepAffectedIds: readonly EntityId[],
      revision: number,
    ) => {
      completedSteps.push({
        key,
        summary,
        affectedIds: [...stepAffectedIds],
        revision,
      });
      affectedIds.push(...stepAffectedIds);
    };

    const runStep = async (
      key: string,
      title: string,
      behavior: WebMcpToolBehavior,
      action: () => Promise<StepResult>,
    ): Promise<void> => {
      const childCorrelationId = `${correlationId}:${key}`;
      await this.emit({
        correlationId: childCorrelationId,
        parentCorrelationId: correlationId,
        toolName: `design_system.${key}`,
        toolTitle: title,
        behavior,
        status: "running",
        summary: `Running ${title.toLowerCase()}.`,
        timestamp: this.dependencies.clock.now(),
        affectedIds: [],
      });
      try {
        const result = await action();
        await this.emit({
          correlationId: childCorrelationId,
          parentCorrelationId: correlationId,
          toolName: `design_system.${key}`,
          toolTitle: title,
          behavior,
          status: "succeeded",
          summary: result.summary,
          timestamp: this.dependencies.clock.now(),
          affectedIds: result.affectedIds,
        });
      } catch (cause) {
        let current: Architecture | null = null;
        try {
          current = await this.dependencies.architectureService.get(
            prepared.architectureId,
          );
        } catch {
          // Preserve the original workflow failure when state inspection fails.
        }
        const message =
          cause instanceof Error ? cause.message : `${title} could not complete.`;
        await this.emit({
          correlationId: childCorrelationId,
          parentCorrelationId: correlationId,
          toolName: `design_system.${key}`,
          toolTitle: title,
          behavior,
          status: "failed",
          summary: message,
          timestamp: this.dependencies.clock.now(),
          affectedIds: [],
        });
        throw new WorkflowError(
          "WORKFLOW_FAILED",
          `Design-system workflow stopped during '${title}'. Earlier writes were not rolled back.`,
          {
            architectureId: prepared.architectureId,
            completedSteps,
            failedStep: { key, title, message },
            affectedIds: [...new Set(affectedIds)],
            finalRevision: current?.revision ?? null,
            recovery:
              "Inspect the current architecture and retry only the incomplete work; completed steps remain persisted.",
          },
        );
      }
    };

    await runStep("metadata", "Create architecture metadata", "mutation", async () => {
      const architecture = await this.dependencies.commandService.execute({
        type: "architecture.create",
        input: {
          id: prepared.architectureId,
          name: request.metadata.name,
          description: request.metadata.description,
        },
      });
      complete(
        "metadata",
        "Created architecture metadata.",
        [architecture.id],
        architecture.revision,
      );
      return {
        summary: `Created architecture '${architecture.name}'.`,
        affectedIds: [architecture.id],
        revision: architecture.revision,
      };
    });

    if (request.requirements.length > 0 || request.constraints.length > 0 || request.providerPreference) {
      await runStep("requirements", "Add requirements and constraints", "mutation", async () => {
        let architecture = await this.requireArchitecture(prepared.architectureId);
        const ids: EntityId[] = [];
        for (const requirement of request.requirements) {
          const id = requirePreparedId(prepared, "requirement", requirement.key);
          architecture = await this.dependencies.commandService.execute({
            type: "requirement.add",
            architectureId: prepared.architectureId,
            requirement: {
              id,
              statement: requirement.statement,
              category: requirement.category,
              priority: requirement.priority,
              target: requirement.target ?? null,
            },
          });
          ids.push(id);
          complete(
            `requirement:${requirement.key}`,
            "Added requirement.",
            [id],
            architecture.revision,
          );
        }
        for (const constraint of request.constraints) {
          const id = requirePreparedId(prepared, "constraint", constraint.key);
          architecture = await this.dependencies.commandService.execute({
            type: "constraint.add",
            architectureId: prepared.architectureId,
            constraint: {
              id,
              kind: constraint.kind,
              statement: constraint.statement,
              severity: constraint.severity,
              value: constraint.value ?? null,
              source: constraint.source ?? "design_system",
            },
          });
          ids.push(id);
          complete(
            `constraint:${constraint.key}`,
            "Added constraint.",
            [id],
            architecture.revision,
          );
        }
        if (request.providerPreference) {
          const preference = request.providerPreference;
          const id = requirePreparedId(prepared, "constraint", preference.key);
          architecture = await this.dependencies.commandService.execute({
            type: "constraint.add",
            architectureId: prepared.architectureId,
            constraint: {
              id,
              kind: "provider",
              statement:
                preference.rationale ??
                `Prefer provider '${preference.providerId}'.`,
              severity: "preference",
              value: preference.providerId,
              source: "design_system.providerPreference",
            },
          });
          ids.push(id);
          complete(
            `constraint:${preference.key}`,
            "Added provider preference constraint.",
            [id],
            architecture.revision,
          );
        }
        return {
          summary: `Added ${request.requirements.length} requirements and ${ids.length - request.requirements.length} constraints.`,
          affectedIds: ids,
          revision: architecture.revision,
        };
      });
    }

    if (request.components.length > 0) {
      await runStep("components", "Add components", "mutation", async () => {
        let architecture = await this.requireArchitecture(prepared.architectureId);
        const ids: EntityId[] = [];
        for (const component of request.components) {
          const id = requirePreparedId(prepared, "component", component.key);
          architecture = await this.dependencies.commandService.execute({
            type: "component.add",
            architectureId: prepared.architectureId,
            component: {
              id,
              capabilityId: component.capabilityId,
              name: component.name,
              description: component.description ?? "",
              position: component.position ?? { x: 0, y: 0 },
              existingInfrastructure: component.existingInfrastructure ?? false,
            },
          });
          ids.push(id);
          complete(
            `component:${component.key}`,
            "Added provider-neutral component.",
            [id],
            architecture.revision,
          );
        }
        return {
          summary: `Added ${ids.length} provider-neutral components.`,
          affectedIds: ids,
          revision: architecture.revision,
        };
      });
    }

    if (request.connections.length > 0) {
      await runStep("connections", "Connect components", "mutation", async () => {
        let architecture = await this.requireArchitecture(prepared.architectureId);
        const ids: EntityId[] = [];
        for (const connection of request.connections) {
          const id = requirePreparedId(prepared, "connection", connection.key);
          architecture = await this.dependencies.commandService.execute({
            type: "connection.connect",
            architectureId: prepared.architectureId,
            connection: {
              id,
              sourceComponentId: requirePreparedId(
                prepared,
                "component",
                connection.sourceComponentKey,
              ),
              targetComponentId: requirePreparedId(
                prepared,
                "component",
                connection.targetComponentKey,
              ),
              relationship: connection.relationship,
              label: connection.label ?? "",
            },
          });
          ids.push(id);
          complete(
            `connection:${connection.key}`,
            "Connected components.",
            [id],
            architecture.revision,
          );
        }
        return {
          summary: `Added ${ids.length} semantic connections.`,
          affectedIds: ids,
          revision: architecture.revision,
        };
      });
    }

    if (request.resolutions.length > 0) {
      await runStep("resolutions", "Apply explicit resolutions", "mutation", async () => {
        let architecture = await this.requireArchitecture(prepared.architectureId);
        const ids: EntityId[] = [];
        for (const resolution of request.resolutions) {
          const componentId = requirePreparedId(
            prepared,
            "component",
            resolution.componentKey,
          );
          if (resolution.technologyId !== undefined) {
            architecture = this.selectedArchitecture(
              await this.dependencies.resolutionService.execute({
                type: "resolution.set-technology",
                architectureId: prepared.architectureId,
                componentId,
                technologyId: resolution.technologyId,
              }),
            );
            complete(
              `resolution:${resolution.componentKey}:technology`,
              "Applied explicit technology resolution.",
              [componentId],
              architecture.revision,
            );
          }
          if (resolution.providerId !== undefined) {
            architecture = this.selectedArchitecture(
              await this.dependencies.resolutionService.execute({
                type: "resolution.set-provider",
                architectureId: prepared.architectureId,
                componentId,
                providerId: resolution.providerId,
              }),
            );
            complete(
              `resolution:${resolution.componentKey}:provider`,
              "Applied explicit provider resolution.",
              [componentId],
              architecture.revision,
            );
          }
          if (resolution.cloudServiceId !== undefined) {
            architecture = this.selectedArchitecture(
              await this.dependencies.resolutionService.execute({
                type: "resolution.set-cloud-service",
                architectureId: prepared.architectureId,
                componentId,
                cloudServiceId: resolution.cloudServiceId,
              }),
            );
            complete(
              `resolution:${resolution.componentKey}:cloud-service`,
              "Applied explicit cloud service resolution.",
              [componentId],
              architecture.revision,
            );
          }
          ids.push(componentId);
        }
        return {
          summary: `Applied explicit resolutions to ${ids.length} components.`,
          affectedIds: [...new Set(ids)],
          revision: architecture.revision,
        };
      });
    }

    let validationIssues: readonly ValidationIssue[] = [];
    await runStep("validation", "Validate final architecture", "read", async () => {
      validationIssues = await this.dependencies.validationService.validate(
        prepared.architectureId,
      );
      const architecture = await this.requireArchitecture(prepared.architectureId);
      complete(
        "validation",
        `Validated architecture with ${validationIssues.length} issues.`,
        [],
        architecture.revision,
      );
      return {
        summary: `Final validation found ${validationIssues.length} issues.`,
        affectedIds: [],
        revision: architecture.revision,
      };
    });

    const finalArchitecture = await this.requireArchitecture(prepared.architectureId);
    return {
      architectureId: finalArchitecture.id,
      finalRevision: finalArchitecture.revision,
      executedSteps: completedSteps,
      idCorrelations: prepared.idCorrelations,
      affectedIds: [...new Set(affectedIds)],
      validationIssues,
      unresolvedDecisions: this.unresolvedDecisions(
        finalArchitecture,
        request.components,
        prepared,
      ),
    };
  }

  private async preflight(
    request: DesignSystemWorkflowRequest,
  ): Promise<PreparedWorkflow> {
    const ids = new Map<string, EntityId>();
    const idCorrelations: DesignSystemIdCorrelation[] = [];
    const reserve = (kind: DesignSystemEntityKind, key: string, prefix: string) => {
      const id = this.dependencies.idGenerator.next(prefix);
      ids.set(generatedKey(kind, key), id);
      idCorrelations.push({ kind, key, id });
      return id;
    };
    const architectureId = reserve("architecture", "architecture", "architecture");
    for (const item of request.requirements) reserve("requirement", item.key, "requirement");
    for (const item of request.constraints) reserve("constraint", item.key, "constraint");
    if (request.providerPreference) {
      reserve("constraint", request.providerPreference.key, "constraint");
    }
    for (const item of request.components) reserve("component", item.key, "component");
    for (const item of request.connections) reserve("connection", item.key, "connection");

    const issues: Array<{ path: string; message: string }> = [];
    const generatedIds = idCorrelations.map(({ id }) => id);
    if (new Set(generatedIds).size !== generatedIds.length) {
      issues.push({
        path: "generatedIds",
        message: "The injected ID factory returned duplicate IDs.",
      });
    }
    if (await this.dependencies.architectureService.get(architectureId)) {
      issues.push({
        path: "metadata",
        message: `Generated architecture ID '${architectureId}' already exists.`,
      });
    }
    request.components.forEach((component, index) => {
      if (!this.dependencies.componentCatalog.getCapability(component.capabilityId)) {
        issues.push({
          path: `components.${index}.capabilityId`,
          message: `Capability '${component.capabilityId}' is not in the catalog.`,
        });
      }
    });
    if (
      request.providerPreference &&
      !this.dependencies.providerCatalog.getProvider(
        request.providerPreference.providerId,
      )
    ) {
      issues.push({
        path: "providerPreference.providerId",
        message: `Provider '${request.providerPreference.providerId}' is not in the catalog.`,
      });
    }

    if (issues.length === 0) {
      try {
        this.buildPreview(request, { architectureId, ids, idCorrelations });
      } catch (cause) {
        issues.push({
          path: "workflow",
          message:
            cause instanceof Error
              ? cause.message
              : "The workflow preview could not be constructed.",
        });
      }
    }
    if (issues.length > 0) {
      throw new WorkflowError(
        "VALIDATION_ERROR",
        "Design-system workflow preflight failed; no architecture changes were written.",
        { phase: "preflight", writesApplied: 0, issues },
      );
    }
    return { architectureId, ids, idCorrelations };
  }

  private buildPreview(
    request: DesignSystemWorkflowRequest,
    prepared: PreparedWorkflow,
  ): Architecture {
    const at = this.dependencies.clock.now();
    let architecture = createArchitecture(
      {
        id: prepared.architectureId,
        name: request.metadata.name,
        description: request.metadata.description,
      },
      at,
    );
    for (const requirement of request.requirements) {
      architecture = addRequirement(
        architecture,
        {
          id: requirePreparedId(prepared, "requirement", requirement.key),
          statement: requirement.statement,
          category: requirement.category,
          priority: requirement.priority,
          target: requirement.target ?? null,
        },
        at,
      );
    }
    for (const constraint of request.constraints) {
      architecture = addConstraint(
        architecture,
        {
          id: requirePreparedId(prepared, "constraint", constraint.key),
          kind: constraint.kind,
          statement: constraint.statement,
          severity: constraint.severity,
          value: constraint.value ?? null,
          source: constraint.source ?? "design_system",
        },
        at,
      );
    }
    if (request.providerPreference) {
      const preference = request.providerPreference;
      architecture = addConstraint(
        architecture,
        {
          id: requirePreparedId(prepared, "constraint", preference.key),
          kind: "provider",
          statement:
            preference.rationale ?? `Prefer provider '${preference.providerId}'.`,
          severity: "preference",
          value: preference.providerId,
          source: "design_system.providerPreference",
        },
        at,
      );
    }
    for (const component of request.components) {
      architecture = addComponent(
        architecture,
        {
          id: requirePreparedId(prepared, "component", component.key),
          capabilityId: component.capabilityId,
          name: component.name,
          description: component.description ?? "",
          position: component.position ?? { x: 0, y: 0 },
          existingInfrastructure: component.existingInfrastructure ?? false,
        },
        at,
      );
    }
    for (const connection of request.connections) {
      architecture = connectComponents(
        architecture,
        {
          id: requirePreparedId(prepared, "connection", connection.key),
          sourceComponentId: requirePreparedId(
            prepared,
            "component",
            connection.sourceComponentKey,
          ),
          targetComponentId: requirePreparedId(
            prepared,
            "component",
            connection.targetComponentKey,
          ),
          relationship: connection.relationship,
          label: connection.label ?? "",
        },
        at,
      );
    }
    for (const resolution of request.resolutions) {
      const componentId = requirePreparedId(
        prepared,
        "component",
        resolution.componentKey,
      );
      if (resolution.technologyId !== undefined) {
        const error = this.dependencies.resolutionEngine.assessSelection(
          architecture,
          componentId,
          "technology",
          resolution.technologyId,
        );
        if (error) {
          throw new WorkflowError("VALIDATION_ERROR", error.message, {
            issue: resolutionIssue(
              resolution.componentKey,
              "technologyId",
              error.message,
            ),
          });
        }
        architecture = setTechnology(
          architecture,
          componentId,
          resolution.technologyId,
          at,
        );
      }
      if (resolution.providerId !== undefined) {
        const error = this.dependencies.resolutionEngine.assessSelection(
          architecture,
          componentId,
          "provider",
          resolution.providerId,
        );
        if (error) {
          throw new WorkflowError("VALIDATION_ERROR", error.message, {
            issue: resolutionIssue(
              resolution.componentKey,
              "providerId",
              error.message,
            ),
          });
        }
        architecture = setProvider(
          architecture,
          componentId,
          resolution.providerId,
          at,
        );
      }
      if (resolution.cloudServiceId !== undefined) {
        const error = this.dependencies.resolutionEngine.assessSelection(
          architecture,
          componentId,
          "cloud-service",
          resolution.cloudServiceId,
        );
        if (error) {
          throw new WorkflowError("VALIDATION_ERROR", error.message, {
            issue: resolutionIssue(
              resolution.componentKey,
              "cloudServiceId",
              error.message,
            ),
          });
        }
        architecture = setCloudService(
          architecture,
          componentId,
          resolution.cloudServiceId,
          at,
        );
      }
    }
    return architecture;
  }

  private selectedArchitecture(
    result: Awaited<ReturnType<ResolutionService["execute"]>>,
  ): Architecture {
    if (!result.ok) {
      throw new WorkflowError("WORKFLOW_FAILED", result.error.message, {
        componentId: result.error.componentId,
        candidateKind: result.error.candidateKind,
        candidateId: result.error.candidateId,
      });
    }
    return result.value;
  }

  private unresolvedDecisions(
    architecture: Architecture,
    inputs: readonly DesignSystemComponentInput[],
    prepared: PreparedWorkflow,
  ): readonly DesignSystemUnresolvedDecision[] {
    const keyById = new Map(
      inputs.map((component) => [
        requirePreparedId(prepared, "component", component.key),
        component.key,
      ]),
    );
    return architecture.components.flatMap((component) => {
      const componentKey = keyById.get(component.id) ?? component.id;
      const unresolved: DesignSystemUnresolvedDecision[] = [];
      if (!component.technologyId) {
        unresolved.push({
          componentId: component.id,
          componentKey,
          level: "technology",
          reason: "No technology was explicitly selected.",
        });
      }
      if (!component.providerId) {
        unresolved.push({
          componentId: component.id,
          componentKey,
          level: "provider",
          reason: "No provider was explicitly selected.",
        });
      } else if (!component.cloudServiceId) {
        unresolved.push({
          componentId: component.id,
          componentKey,
          level: "cloud-service",
          reason: "No cloud service was explicitly selected.",
        });
      }
      return unresolved;
    });
  }

  private async requireArchitecture(id: EntityId): Promise<Architecture> {
    const architecture = await this.dependencies.architectureService.get(id);
    if (!architecture) {
      throw new Error(`Architecture '${id}' was not found after workflow mutation.`);
    }
    return architecture;
  }

  private async emit(event: WebMcpActivityEvent): Promise<void> {
    try {
      await this.dependencies.activitySink.record(event);
    } catch {
      // Observability must never alter workflow behavior.
    }
  }
}
