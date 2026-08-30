import {
  DomainError,
  type Architecture,
  type Component,
  type Constraint,
  type EntityId,
  type Requirement,
} from "@/domain/architecture";
import type {
  CloudServiceDefinition,
  ComponentCatalog,
  ProviderCatalog,
  TechnologyDefinition,
} from "@/domain/catalog";

import type {
  IncompatibleSelectionError,
  ResolutionCandidate,
  ResolutionCandidateKind,
  ResolutionConflict,
  ResolutionReason,
  ResolutionResult,
  ResolutionScoreBand,
} from "./model";

interface CandidateEvaluation {
  readonly candidateId: EntityId;
  readonly label: string;
  readonly reasons: readonly ResolutionReason[];
  readonly tradeoffs: readonly string[];
  readonly conflicts: readonly ResolutionConflict[];
}

interface ResolutionContext {
  readonly architecture: Architecture;
  readonly component: Component;
  readonly scoreEvidence: boolean;
}

const requirementWeights: Readonly<Record<Requirement["priority"], number>> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

function constraintValues(constraint: Constraint): readonly string[] {
  if (typeof constraint.value === "string") return [constraint.value];
  if (Array.isArray(constraint.value)) return constraint.value;
  return [];
}

function uniqueIds(ids: readonly EntityId[]): readonly EntityId[] {
  return [...new Set(ids)].sort((left, right) => left.localeCompare(right, "en"));
}

function reason(
  code: string,
  message: string,
  impact: number,
  evidenceIds: readonly EntityId[] = [],
): ResolutionReason {
  return { code, message, impact, evidenceIds: uniqueIds(evidenceIds) };
}

function conflict(
  code: string,
  message: string,
  candidateId: EntityId,
  evidenceIds: readonly EntityId[],
): ResolutionConflict {
  return {
    code,
    message,
    candidateId,
    evidenceIds: uniqueIds(evidenceIds),
  };
}

function scoreBand(score: number): ResolutionScoreBand {
  if (score >= 8) return "strong";
  if (score >= 3) return "moderate";
  return "weak";
}

function findComponent(
  architecture: Architecture,
  componentId: EntityId,
): Component {
  const component = architecture.components.find(({ id }) => id === componentId);
  if (!component) {
    throw new DomainError(
      "ENTITY_NOT_FOUND",
      `Component '${componentId}' was not found.`,
      { entity: "Component", id: componentId },
    );
  }
  return component;
}

function hardConstraints(
  context: ResolutionContext,
  kind: Constraint["kind"],
): readonly Constraint[] {
  return context.architecture.constraints.filter(
    (constraint) =>
      constraint.kind === kind &&
      constraint.severity === "hard" &&
      constraintValues(constraint).length > 0,
  );
}

function preferenceConstraints(
  context: ResolutionContext,
  kind: Constraint["kind"],
): readonly Constraint[] {
  if (!context.scoreEvidence) return [];
  return context.architecture.constraints.filter(
    (constraint) =>
      constraint.kind === kind &&
      constraint.severity === "preference" &&
      constraintValues(constraint).length > 0,
  );
}

function selectedCandidateId(
  component: Component,
  kind: ResolutionCandidateKind,
): EntityId | null {
  switch (kind) {
    case "technology":
      return component.technologyId;
    case "provider":
      return component.providerId;
    case "cloud-service":
      return component.cloudServiceId;
  }
}

function currentSelectionEvidence(
  context: ResolutionContext,
  kind: ResolutionCandidateKind,
  candidateId: EntityId,
): readonly ResolutionReason[] {
  if (
    !context.scoreEvidence ||
    selectedCandidateId(context.component, kind) !== candidateId
  ) {
    return [];
  }
  return [
    reason(
      "CURRENT_SELECTION",
      "This is the component's current explicit selection.",
      4,
      [context.component.id],
    ),
  ];
}

function existingInfrastructureEvaluation(
  context: ResolutionContext,
  kind: ResolutionCandidateKind,
  candidateId: EntityId,
  allCandidateIds: ReadonlySet<EntityId>,
): Pick<CandidateEvaluation, "reasons" | "conflicts"> {
  const reasons: ResolutionReason[] = [];
  const conflicts: ResolutionConflict[] = [];
  const selectedId = selectedCandidateId(context.component, kind);

  if (
    context.component.existingInfrastructure &&
    selectedId !== null &&
    selectedId !== candidateId
  ) {
    conflicts.push(
      conflict(
        "EXISTING_COMPONENT_SELECTION",
        `Existing infrastructure is already resolved to '${selectedId}'.`,
        candidateId,
        [context.component.id],
      ),
    );
  }

  const existingComponentIds = context.architecture.components
    .filter(
      (component) =>
        component.existingInfrastructure &&
        selectedCandidateId(component, kind) === candidateId,
    )
    .map(({ id }) => id);
  if (context.scoreEvidence && existingComponentIds.length > 0) {
    reasons.push(
      reason(
        "EXISTING_INFRASTRUCTURE_REUSE",
        "This candidate matches explicitly modeled existing infrastructure.",
        5,
        existingComponentIds,
      ),
    );
  }

  for (const constraint of hardConstraints(
    context,
    "existing-infrastructure",
  )) {
    const relevantIds = constraintValues(constraint).filter((id) =>
      allCandidateIds.has(id),
    );
    if (relevantIds.length > 0 && !relevantIds.includes(candidateId)) {
      conflicts.push(
        conflict(
          "EXISTING_INFRASTRUCTURE_CONSTRAINT",
          "Candidate does not match the required existing infrastructure.",
          candidateId,
          [constraint.id],
        ),
      );
    }
  }

  for (const constraint of preferenceConstraints(
    context,
    "existing-infrastructure",
  )) {
    if (constraintValues(constraint).includes(candidateId)) {
      reasons.push(
        reason(
          "EXISTING_INFRASTRUCTURE_PREFERENCE",
          "Candidate matches a preferred existing-infrastructure reference.",
          4,
          [constraint.id],
        ),
      );
    }
  }

  return { reasons, conflicts };
}

function requirementReasonsForTechnology(
  technology: TechnologyDefinition,
  requirements: readonly Requirement[],
): readonly ResolutionReason[] {
  const reasons: ResolutionReason[] = [];
  for (const requirement of requirements) {
    const weight = requirementWeights[requirement.priority];
    if (
      requirement.category === "performance" &&
      ["horizontal", "elastic"].includes(technology.operationalTraits.scaling)
    ) {
      reasons.push(
        reason(
          "REQUIREMENT_SCALING_FIT",
          `${technology.label}'s ${technology.operationalTraits.scaling} scaling supports a ${requirement.priority} performance requirement.`,
          weight,
          [requirement.id],
        ),
      );
    }
    if (
      requirement.category === "reliability" &&
      ["horizontal", "elastic"].includes(technology.operationalTraits.scaling)
    ) {
      reasons.push(
        reason(
          "REQUIREMENT_RELIABILITY_FIT",
          `${technology.label} supports distribution through ${technology.operationalTraits.scaling} scaling.`,
          weight,
          [requirement.id],
        ),
      );
    }
    if (
      requirement.category === "operability" &&
      technology.operationalTraits.complexity !== "high"
    ) {
      reasons.push(
        reason(
          "REQUIREMENT_OPERABILITY_FIT",
          `${technology.label} has ${technology.operationalTraits.complexity} cataloged operational complexity.`,
          technology.operationalTraits.complexity === "low"
            ? weight
            : Math.ceil(weight / 2),
          [requirement.id],
        ),
      );
    }
    if (
      requirement.category === "cost" &&
      technology.operationalTraits.complexity === "low"
    ) {
      reasons.push(
        reason(
          "REQUIREMENT_COST_POSTURE",
          `${technology.label}'s low operational complexity can reduce operating effort.`,
          Math.ceil(weight / 2),
          [requirement.id],
        ),
      );
    }
  }
  return reasons;
}

function operationalTokensForTechnology(
  technology: TechnologyDefinition,
): readonly string[] {
  return [
    technology.operationalTraits.complexity,
    technology.operationalTraits.scaling,
    technology.operationalTraits.state,
  ];
}

function operationalConstraintEvaluation(
  context: ResolutionContext,
  candidateId: EntityId,
  tokens: readonly string[],
): Pick<CandidateEvaluation, "reasons" | "conflicts"> {
  const reasons: ResolutionReason[] = [];
  const conflicts: ResolutionConflict[] = [];
  for (const constraint of hardConstraints(context, "operational")) {
    if (!constraintValues(constraint).some((value) => tokens.includes(value))) {
      conflicts.push(
        conflict(
          "OPERATIONAL_CONSTRAINT",
          "Candidate does not match the required operational model.",
          candidateId,
          [constraint.id],
        ),
      );
    }
  }
  for (const constraint of preferenceConstraints(context, "operational")) {
    if (constraintValues(constraint).some((value) => tokens.includes(value))) {
      reasons.push(
        reason(
          "OPERATIONAL_PREFERENCE",
          "Candidate matches a preferred operational model.",
          3,
          [constraint.id],
        ),
      );
    }
  }
  return { reasons, conflicts };
}

function requirementReasonsForService(
  service: CloudServiceDefinition,
  requirements: readonly Requirement[],
): readonly ResolutionReason[] {
  const reasons: ResolutionReason[] = [];
  for (const requirement of requirements) {
    const weight = requirementWeights[requirement.priority];
    if (
      requirement.category === "performance" &&
      ["managed-platform", "managed-cluster", "serverless"].includes(
        service.managementModel,
      )
    ) {
      reasons.push(
        reason(
          "REQUIREMENT_PLATFORM_SCALING",
          `${service.label}'s ${service.managementModel} model supports managed scaling choices.`,
          weight,
          [requirement.id],
        ),
      );
    }
    if (
      requirement.category === "reliability" &&
      ["fully-managed", "managed-cluster"].includes(service.managementModel)
    ) {
      reasons.push(
        reason(
          "REQUIREMENT_MANAGED_RELIABILITY",
          `${service.label} exposes provider-managed reliability capabilities.`,
          weight,
          [requirement.id],
        ),
      );
    }
    if (
      requirement.category === "operability" &&
      ["serverless", "fully-managed"].includes(service.managementModel)
    ) {
      reasons.push(
        reason(
          "REQUIREMENT_MANAGED_OPERATIONS",
          `${service.label}'s ${service.managementModel} model reduces infrastructure ownership.`,
          weight,
          [requirement.id],
        ),
      );
    }
    if (
      requirement.category === "cost" &&
      service.managementModel === "serverless"
    ) {
      reasons.push(
        reason(
          "REQUIREMENT_SERVERLESS_COST_POSTURE",
          `${service.label} supports a serverless capacity model without dedicated idle infrastructure.`,
          weight,
          [requirement.id],
        ),
      );
    }
  }
  return reasons;
}

function toCandidate(
  evaluation: CandidateEvaluation,
  candidateKind: ResolutionCandidateKind,
): ResolutionCandidate {
  const score = evaluation.reasons.reduce(
    (total, current) => total + current.impact,
    0,
  );
  return {
    candidateId: evaluation.candidateId,
    candidateKind,
    label: evaluation.label,
    score,
    scoreBand: scoreBand(score),
    reasons: evaluation.reasons,
    tradeoffs: evaluation.tradeoffs,
    conflicts: evaluation.conflicts,
    evidenceIds: uniqueIds(
      evaluation.reasons.flatMap(({ evidenceIds }) => evidenceIds),
    ),
  };
}

function providerConstraintEvaluation(
  context: ResolutionContext,
  providerId: EntityId,
  conflictCandidateId: EntityId = providerId,
): Pick<CandidateEvaluation, "reasons" | "conflicts"> {
  const reasons: ResolutionReason[] = [];
  const conflicts: ResolutionConflict[] = [];
  for (const constraint of hardConstraints(context, "provider")) {
    if (!constraintValues(constraint).includes(providerId)) {
      conflicts.push(
        conflict(
          "PROVIDER_CONSTRAINT",
          "Candidate does not match the required provider.",
          conflictCandidateId,
          [constraint.id],
        ),
      );
    }
  }
  for (const constraint of preferenceConstraints(context, "provider")) {
    if (constraintValues(constraint).includes(providerId)) {
      reasons.push(
        reason(
          "PROVIDER_PREFERENCE",
          "Candidate matches the preferred provider.",
          5,
          [constraint.id],
        ),
      );
    }
  }
  return { reasons, conflicts };
}

export class ResolutionEngine {
  constructor(
    private readonly componentCatalog: ComponentCatalog,
    private readonly providerCatalog: ProviderCatalog,
  ) {}

  list(
    architecture: Architecture,
    componentId: EntityId,
    candidateKind: ResolutionCandidateKind,
  ): ResolutionResult {
    return this.resolve(architecture, componentId, candidateKind, false);
  }

  suggest(
    architecture: Architecture,
    componentId: EntityId,
    candidateKind: ResolutionCandidateKind,
  ): ResolutionResult {
    return this.resolve(architecture, componentId, candidateKind, true);
  }

  assessSelection(
    architecture: Architecture,
    componentId: EntityId,
    candidateKind: ResolutionCandidateKind,
    candidateId: EntityId,
  ): IncompatibleSelectionError | null {
    const component = findComponent(architecture, componentId);
    if (!this.candidateExists(candidateKind, candidateId)) {
      const alternatives = this.suggest(
        architecture,
        componentId,
        candidateKind,
      ).candidates;
      return {
        code: "INCOMPATIBLE_SELECTION",
        message: `${candidateKind} '${candidateId}' does not exist in the catalog.`,
        componentId,
        candidateKind,
        candidateId,
        evidenceIds: [component.id],
        viableAlternativeIds: alternatives.map(({ candidateId: id }) => id),
      };
    }

    if (!this.candidateSupportsComponent(candidateKind, candidateId, component)) {
      const alternatives = this.suggest(
        architecture,
        componentId,
        candidateKind,
      ).candidates;
      return {
        code: "INCOMPATIBLE_SELECTION",
        message: `${candidateKind} '${candidateId}' does not support capability '${component.capabilityId}'.`,
        componentId,
        candidateKind,
        candidateId,
        evidenceIds: [component.id],
        viableAlternativeIds: alternatives.map(({ candidateId: id }) => id),
      };
    }

    if (candidateKind === "cloud-service" && component.providerId === null) {
      return {
        code: "INCOMPATIBLE_SELECTION",
        message: "A provider must be selected before selecting a cloud service.",
        componentId,
        candidateKind,
        candidateId,
        evidenceIds: [component.id],
        viableAlternativeIds: [],
      };
    }

    const result = this.suggest(architecture, componentId, candidateKind);
    if (result.candidates.some(({ candidateId: id }) => id === candidateId)) {
      return null;
    }
    const matchingConflicts = result.conflicts.filter(
      ({ candidateId: id }) => id === candidateId,
    );
    return {
      code: "INCOMPATIBLE_SELECTION",
      message: `${candidateKind} '${candidateId}' conflicts with the current architecture evidence.`,
      componentId,
      candidateKind,
      candidateId,
      evidenceIds: uniqueIds(
        matchingConflicts.flatMap(({ evidenceIds }) => evidenceIds),
      ),
      viableAlternativeIds: result.candidates.map(
        ({ candidateId: id }) => id,
      ),
    };
  }

  private resolve(
    architecture: Architecture,
    componentId: EntityId,
    candidateKind: ResolutionCandidateKind,
    scoreEvidence: boolean,
  ): ResolutionResult {
    const context: ResolutionContext = {
      architecture,
      component: findComponent(architecture, componentId),
      scoreEvidence,
    };
    const evaluations = this.evaluate(context, candidateKind);
    const conflicts = evaluations.flatMap((evaluation) => evaluation.conflicts);
    const candidates = evaluations
      .filter((evaluation) => evaluation.conflicts.length === 0)
      .map((evaluation) => toCandidate(evaluation, candidateKind))
      .sort(
        (left, right) =>
          right.score - left.score ||
          left.candidateId.localeCompare(right.candidateId, "en"),
      );

    return {
      componentId,
      candidateKind,
      candidates,
      conflicts:
        candidates.length > 0
          ? conflicts
          : [
              ...conflicts,
              {
                code: "NO_COMPATIBLE_CANDIDATE",
                message: `No compatible ${candidateKind} candidates are available.`,
                candidateId: null,
                evidenceIds: [componentId],
              },
            ],
    };
  }

  private evaluate(
    context: ResolutionContext,
    candidateKind: ResolutionCandidateKind,
  ): readonly CandidateEvaluation[] {
    switch (candidateKind) {
      case "technology":
        return this.evaluateTechnologies(context);
      case "provider":
        return this.evaluateProviders(context);
      case "cloud-service":
        return this.evaluateServices(context);
    }
  }

  private evaluateTechnologies(
    context: ResolutionContext,
  ): readonly CandidateEvaluation[] {
    const allTechnologies = this.componentCatalog.listTechnologies();
    const allCandidateIds = new Set(allTechnologies.map(({ id }) => id));
    return allTechnologies
      .filter(({ capabilityIds }) =>
        capabilityIds.includes(context.component.capabilityId),
      )
      .map((technology) => {
        const reasons: ResolutionReason[] = [
          reason(
            "CAPABILITY_MATCH",
            `${technology.label} supports the component capability.`,
            0,
          ),
          ...currentSelectionEvidence(
            context,
            "technology",
            technology.id,
          ),
        ];
        const conflicts: ResolutionConflict[] = [];
        const operational = operationalConstraintEvaluation(
          context,
          technology.id,
          operationalTokensForTechnology(technology),
        );
        reasons.push(...operational.reasons);
        conflicts.push(...operational.conflicts);

        for (const constraint of hardConstraints(context, "skill")) {
          if (
            !constraintValues(constraint).some((skill) =>
              technology.operationalTraits.skillTags.includes(skill),
            )
          ) {
            conflicts.push(
              conflict(
                "SKILL_CONSTRAINT",
                `${technology.label} does not match the required team skills.`,
                technology.id,
                [constraint.id],
              ),
            );
          }
        }
        for (const constraint of preferenceConstraints(context, "skill")) {
          if (
            constraintValues(constraint).some((skill) =>
              technology.operationalTraits.skillTags.includes(skill),
            )
          ) {
            reasons.push(
              reason(
                "SKILL_PREFERENCE",
                `${technology.label} matches preferred team skills.`,
                3,
                [constraint.id],
              ),
            );
          }
        }

        const infrastructure = existingInfrastructureEvaluation(
          context,
          "technology",
          technology.id,
          allCandidateIds,
        );
        reasons.push(...infrastructure.reasons);
        conflicts.push(...infrastructure.conflicts);

        const compatibleServices = this.providerCatalog.listServices({
          capabilityId: context.component.capabilityId,
          technologyId: technology.id,
        });
        if (
          context.component.providerId &&
          !compatibleServices.some(
            ({ providerId }) => providerId === context.component.providerId,
          )
        ) {
          conflicts.push(
            conflict(
              "PROVIDER_TECHNOLOGY_COMPATIBILITY",
              `${technology.label} has no compatible service for the selected provider.`,
              technology.id,
              [context.component.id],
            ),
          );
        }
        for (const constraint of hardConstraints(context, "provider")) {
          const allowedProviderIds = constraintValues(constraint);
          if (
            !compatibleServices.some(({ providerId }) =>
              allowedProviderIds.includes(providerId),
            )
          ) {
            conflicts.push(
              conflict(
                "PROVIDER_TECHNOLOGY_COMPATIBILITY",
                `${technology.label} has no compatible service for the required provider.`,
                technology.id,
                [constraint.id],
              ),
            );
          }
        }
        for (const constraint of preferenceConstraints(context, "provider")) {
          const preferredProviderIds = constraintValues(constraint);
          if (
            compatibleServices.some(({ providerId }) =>
              preferredProviderIds.includes(providerId),
            )
          ) {
            reasons.push(
              reason(
                "PROVIDER_PREFERENCE_COMPATIBILITY",
                `${technology.label} has a compatible service from the preferred provider.`,
                2,
                [constraint.id],
              ),
            );
          }
        }
        if (context.component.cloudServiceId) {
          const service = this.providerCatalog.getService(
            context.component.cloudServiceId,
          );
          if (
            service &&
            !service.compatibleTechnologyIds.includes(technology.id)
          ) {
            conflicts.push(
              conflict(
                "SELECTED_SERVICE_COMPATIBILITY",
                `${technology.label} is incompatible with the selected cloud service.`,
                technology.id,
                [context.component.id, service.id],
              ),
            );
          }
        }

        if (context.scoreEvidence) {
          reasons.push(
            ...requirementReasonsForTechnology(
              technology,
              context.architecture.requirements,
            ),
          );
        }
        return {
          candidateId: technology.id,
          label: technology.label,
          reasons,
          tradeoffs: technology.tradeoffs,
          conflicts,
        };
      });
  }

  private evaluateProviders(
    context: ResolutionContext,
  ): readonly CandidateEvaluation[] {
    const allProviders = this.providerCatalog.listProviders();
    const allCandidateIds = new Set(allProviders.map(({ id }) => id));
    return allProviders.map((provider) => {
      const services = this.providerCatalog.listServices({
        providerId: provider.id,
        capabilityId: context.component.capabilityId,
        ...(context.component.technologyId
          ? { technologyId: context.component.technologyId }
          : {}),
      });
      const reasons: ResolutionReason[] = [
        ...currentSelectionEvidence(context, "provider", provider.id),
      ];
      const conflicts: ResolutionConflict[] = [];
      if (services.length === 0) {
        conflicts.push(
          conflict(
            "PROVIDER_CAPABILITY_COMPATIBILITY",
            `${provider.label} has no cataloged service compatible with the component's current resolution.`,
            provider.id,
            [context.component.id],
          ),
        );
      } else {
        reasons.push(
          reason(
            "CAPABILITY_MATCH",
            `${provider.label} offers ${services.length} compatible service candidate${services.length === 1 ? "" : "s"}.`,
            0,
          ),
        );
      }

      const providerConstraints = providerConstraintEvaluation(
        context,
        provider.id,
      );
      reasons.push(...providerConstraints.reasons);
      conflicts.push(...providerConstraints.conflicts);
      const infrastructure = existingInfrastructureEvaluation(
        context,
        "provider",
        provider.id,
        allCandidateIds,
      );
      reasons.push(...infrastructure.reasons);
      conflicts.push(...infrastructure.conflicts);

      if (context.scoreEvidence && services.length > 0) {
        for (const requirement of context.architecture.requirements) {
          const serviceReasons = services.flatMap((service) =>
            requirementReasonsForService(service, [requirement]),
          );
          const bestReason = serviceReasons.sort(
            (left, right) => right.impact - left.impact,
          )[0];
          if (bestReason) {
            reasons.push(
              reason(
                "PROVIDER_SERVICE_EVIDENCE",
                `${provider.label} has a compatible service supporting this requirement.`,
                bestReason.impact,
                bestReason.evidenceIds,
              ),
            );
          }
        }
      }

      return {
        candidateId: provider.id,
        label: provider.label,
        reasons,
        tradeoffs: [...new Set(services.flatMap(({ tradeoffs }) => tradeoffs))]
          .sort((left, right) => left.localeCompare(right, "en"))
          .slice(0, 3),
        conflicts,
      };
    });
  }

  private evaluateServices(
    context: ResolutionContext,
  ): readonly CandidateEvaluation[] {
    const allServices = this.providerCatalog.listServices();
    const allCandidateIds = new Set(allServices.map(({ id }) => id));
    return allServices
      .filter(({ capabilityIds }) =>
        capabilityIds.includes(context.component.capabilityId),
      )
      .map((service) => {
        const reasons: ResolutionReason[] = [
          reason(
            "CAPABILITY_MATCH",
            `${service.label} supports the component capability.`,
            0,
          ),
          ...currentSelectionEvidence(
            context,
            "cloud-service",
            service.id,
          ),
        ];
        const conflicts: ResolutionConflict[] = [];
        if (
          context.component.providerId &&
          service.providerId !== context.component.providerId
        ) {
          conflicts.push(
            conflict(
              "SELECTED_PROVIDER",
              `${service.label} does not belong to the selected provider.`,
              service.id,
              [context.component.id],
            ),
          );
        }
        if (
          context.component.technologyId &&
          !service.compatibleTechnologyIds.includes(
            context.component.technologyId,
          )
        ) {
          conflicts.push(
            conflict(
              "SELECTED_TECHNOLOGY",
              `${service.label} is incompatible with the selected technology.`,
              service.id,
              [context.component.id],
            ),
          );
        }

        const providerConstraints = providerConstraintEvaluation(
          context,
          service.providerId,
          service.id,
        );
        reasons.push(...providerConstraints.reasons);
        conflicts.push(...providerConstraints.conflicts);
        const operational = operationalConstraintEvaluation(
          context,
          service.id,
          [service.managementModel],
        );
        reasons.push(...operational.reasons);
        conflicts.push(...operational.conflicts);
        const infrastructure = existingInfrastructureEvaluation(
          context,
          "cloud-service",
          service.id,
          allCandidateIds,
        );
        reasons.push(...infrastructure.reasons);
        conflicts.push(...infrastructure.conflicts);

        if (context.scoreEvidence) {
          reasons.push(
            ...requirementReasonsForService(
              service,
              context.architecture.requirements,
            ),
          );
        }
        return {
          candidateId: service.id,
          label: service.label,
          reasons,
          tradeoffs: service.tradeoffs,
          conflicts,
        };
      });
  }

  private candidateExists(
    candidateKind: ResolutionCandidateKind,
    candidateId: EntityId,
  ): boolean {
    switch (candidateKind) {
      case "technology":
        return this.componentCatalog.getTechnology(candidateId) !== null;
      case "provider":
        return this.providerCatalog.getProvider(candidateId) !== null;
      case "cloud-service":
        return this.providerCatalog.getService(candidateId) !== null;
    }
  }

  private candidateSupportsComponent(
    candidateKind: ResolutionCandidateKind,
    candidateId: EntityId,
    component: Component,
  ): boolean {
    switch (candidateKind) {
      case "technology":
        return (
          this.componentCatalog
            .getTechnology(candidateId)
            ?.capabilityIds.includes(component.capabilityId) ?? false
        );
      case "provider":
        return this.providerSupportsComponent(candidateId, component);
      case "cloud-service":
        return (
          this.providerCatalog
            .getService(candidateId)
            ?.capabilityIds.includes(component.capabilityId) ?? false
        );
    }
  }

  private providerSupportsComponent(
    providerId: EntityId,
    component: Component,
  ): boolean {
    return (
      this.providerCatalog.listServices({
        providerId,
        capabilityId: component.capabilityId,
        ...(component.technologyId
          ? { technologyId: component.technologyId }
          : {}),
      }).length > 0
    );
  }
}
