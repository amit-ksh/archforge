import type { Architecture, EntityId } from "@/domain/architecture";

export type ResolutionCandidateKind =
  | "technology"
  | "provider"
  | "cloud-service";

export type ResolutionScoreBand = "weak" | "moderate" | "strong";

export interface ResolutionReason {
  readonly code: string;
  readonly message: string;
  readonly impact: number;
  readonly evidenceIds: readonly EntityId[];
}

export interface ResolutionConflict {
  readonly code: string;
  readonly message: string;
  readonly candidateId: EntityId | null;
  readonly evidenceIds: readonly EntityId[];
}

export interface ResolutionCandidate {
  readonly candidateId: EntityId;
  readonly candidateKind: ResolutionCandidateKind;
  readonly label: string;
  readonly score: number;
  readonly scoreBand: ResolutionScoreBand;
  readonly reasons: readonly ResolutionReason[];
  readonly tradeoffs: readonly string[];
  readonly conflicts: readonly ResolutionConflict[];
  readonly evidenceIds: readonly EntityId[];
}

export interface ResolutionResult {
  readonly componentId: EntityId;
  readonly candidateKind: ResolutionCandidateKind;
  readonly candidates: readonly ResolutionCandidate[];
  readonly conflicts: readonly ResolutionConflict[];
}

export interface IncompatibleSelectionError {
  readonly code: "INCOMPATIBLE_SELECTION";
  readonly message: string;
  readonly componentId: EntityId;
  readonly candidateKind: ResolutionCandidateKind;
  readonly candidateId: EntityId;
  readonly evidenceIds: readonly EntityId[];
  readonly viableAlternativeIds: readonly EntityId[];
}

export type ResolutionSelectionResult =
  | { readonly ok: true; readonly value: Architecture }
  | { readonly ok: false; readonly error: IncompatibleSelectionError };
