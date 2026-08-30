"use client";

import { useEffect, useMemo, useState } from "react";

import { useArchitectureWorkspace } from "@/app/architecture-provider";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Select,
  Skeleton,
  Tabs,
  TabsList,
  TabsPanel,
  TabsTrigger,
} from "@/components/ui";
import type { Architecture, Component, EntityId } from "@/domain/architecture";
import type {
  ResolutionCandidate,
  ResolutionCandidateKind,
  ResolutionConflict,
  ResolutionResult,
  ResolutionScoreBand,
} from "@/domain/resolution";

import styles from "./resolution.module.css";

type ResolutionLevel = "capability" | ResolutionCandidateKind;
type ScoreFilter = "all" | ResolutionScoreBand;

const LEVEL_PRESENTATION: Record<
  ResolutionCandidateKind,
  { readonly label: string; readonly selected: keyof Component }
> = {
  technology: { label: "Technology", selected: "technologyId" },
  provider: { label: "Provider", selected: "providerId" },
  "cloud-service": { label: "Service", selected: "cloudServiceId" },
};

interface ResolutionWorkspaceProps {
  readonly architecture: Architecture;
  readonly selectedComponentId: EntityId | null;
}

interface ResolutionQueryState {
  readonly key: string | null;
  readonly result: ResolutionResult | null;
  readonly error: string | null;
}

function CandidateEvidence({ candidate }: { candidate: ResolutionCandidate }) {
  return (
    <div className={styles.evidenceGrid}>
      <section>
        <h4>Evidence</h4>
        {candidate.reasons.length > 0 ? (
          <ul>
            {candidate.reasons.map((reason) => (
              <li key={`${reason.code}-${reason.message}`}>
                <span>{reason.message}</span>
                {reason.impact !== 0 ? (
                  <code>{reason.impact > 0 ? `+${reason.impact}` : reason.impact}</code>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p>No scored evidence applies to this option.</p>
        )}
      </section>
      <section>
        <h4>Tradeoffs</h4>
        {candidate.tradeoffs.length > 0 ? (
          <ul>
            {candidate.tradeoffs.map((tradeoff) => (
              <li key={tradeoff}>{tradeoff}</li>
            ))}
          </ul>
        ) : (
          <p>No cataloged tradeoffs.</p>
        )}
      </section>
    </div>
  );
}

function groupBlocked(conflicts: readonly ResolutionConflict[]) {
  const grouped = new Map<EntityId, ResolutionConflict[]>();
  for (const conflict of conflicts) {
    if (!conflict.candidateId) continue;
    grouped.set(conflict.candidateId, [
      ...(grouped.get(conflict.candidateId) ?? []),
      conflict,
    ]);
  }
  return [...grouped.entries()];
}

export function ResolutionWorkspace({
  architecture,
  selectedComponentId,
}: ResolutionWorkspaceProps) {
  const { setResolution, suggestResolution } = useArchitectureWorkspace();
  const component = useMemo(
    () =>
      architecture.components.find(({ id }) => id === selectedComponentId) ??
      null,
    [architecture.components, selectedComponentId],
  );
  const [level, setLevel] = useState<ResolutionLevel>("technology");
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("all");
  const [evidenceOnly, setEvidenceOnly] = useState(false);
  const [openCandidateId, setOpenCandidateId] = useState<EntityId | null>(null);
  const [query, setQuery] = useState<ResolutionQueryState>({
    key: null,
    result: null,
    error: null,
  });
  const [applyingId, setApplyingId] = useState<EntityId | "clear" | null>(null);
  const [requestError, setRequestError] = useState<{
    readonly key: string;
    readonly message: string;
  } | null>(null);
  const queryKey =
    component && level !== "capability"
      ? `${architecture.id}:${architecture.revision}:${component.id}:${level}`
      : null;

  useEffect(() => {
    if (!component || level === "capability" || !queryKey) return;
    let active = true;
    void suggestResolution(component.id, level)
      .then((next) => {
        if (active) setQuery({ key: queryKey, result: next, error: null });
      })
      .catch((cause: unknown) => {
        if (active) {
          setQuery({
            key: queryKey,
            result: null,
            error:
              cause instanceof Error
                ? cause.message
                : "Resolution options could not be loaded.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [component, level, queryKey, suggestResolution]);

  if (!component) {
    return (
      <EmptyState
        message="Select a canvas node to compare technologies, providers, and managed services."
        title="No component selected"
      />
    );
  }

  const candidateKind = level === "capability" ? null : level;
  const loading = queryKey !== null && query.key !== queryKey;
  const result = query.key === queryKey ? query.result : null;
  const visibleError =
    query.key === queryKey
      ? query.error
      : requestError?.key === queryKey
        ? requestError.message
        : null;
  const selectedId = candidateKind
    ? (component[LEVEL_PRESENTATION[candidateKind].selected] as EntityId | null)
    : null;
  const candidates = (result?.candidates ?? []).filter(
    (candidate) =>
      (scoreFilter === "all" || candidate.scoreBand === scoreFilter) &&
      (!evidenceOnly || candidate.evidenceIds.length > 0),
  );
  const selectedIsStale = Boolean(
    selectedId &&
      result &&
      !result.candidates.some(({ candidateId }) => candidateId === selectedId),
  );
  const blocked = groupBlocked(result?.conflicts ?? []);
  const componentId = component.id;

  async function apply(candidateId: EntityId | null) {
    if (!candidateKind) return;
    setApplyingId(candidateId ?? "clear");
    setRequestError(null);
    try {
      await setResolution(componentId, candidateKind, candidateId);
    } catch (cause) {
      setRequestError({
        key: queryKey ?? "",
        message:
          cause instanceof Error
            ? cause.message
            : "The selection could not be saved.",
      });
    } finally {
      setApplyingId(null);
    }
  }

  return (
    <div className={styles.workspace}>
      <div className={styles.trail} aria-label="Resolution trail">
        <span data-resolved="true">
          <small>Capability</small>
          <strong>{component.capabilityId}</strong>
        </span>
        {(["technology", "provider", "cloud-service"] as const).map((kind) => {
          const value = component[LEVEL_PRESENTATION[kind].selected] as
            | EntityId
            | null;
          return (
            <span key={kind} data-resolved={value ? "true" : undefined}>
              <small>{LEVEL_PRESENTATION[kind].label}</small>
              <strong>{value ?? "Unresolved"}</strong>
            </span>
          );
        })}
      </div>

      <Tabs
        onValueChange={(value) => setLevel(value as ResolutionLevel)}
        value={level}
      >
        <TabsList aria-label="Resolution levels">
          <TabsTrigger value="capability">Capability</TabsTrigger>
          <TabsTrigger value="technology">Technology</TabsTrigger>
          <TabsTrigger value="provider">Provider</TabsTrigger>
          <TabsTrigger value="cloud-service">Service</TabsTrigger>
        </TabsList>
        <TabsPanel value="capability">
          <div className={styles.capabilitySummary}>
            <Badge tone="capability">Capability</Badge>
            <h3>{component.capabilityId}</h3>
            <p>
              This semantic identity stays provider-neutral. Change it from the
              Component tab when the system responsibility itself changes.
            </p>
          </div>
        </TabsPanel>
        {(["technology", "provider", "cloud-service"] as const).map((kind) => (
          <TabsPanel key={kind} value={kind}>
            {level === kind ? (
              <div className={styles.candidatePanel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h3>{LEVEL_PRESENTATION[kind].label} candidates</h3>
                    <p>Compare current evidence and tradeoffs before applying.</p>
                  </div>
                  {selectedId ? (
                    <Button
                      busy={applyingId === "clear"}
                      onClick={() => void apply(null)}
                      size="compact"
                      variant="secondary"
                    >
                      Clear selection
                    </Button>
                  ) : (
                    <Badge tone="neutral">Unresolved</Badge>
                  )}
                </div>

                <div className={styles.filters} aria-label="Candidate filters">
                  <Select
                    label="Score band"
                    onChange={(event) =>
                      setScoreFilter(event.target.value as ScoreFilter)
                    }
                    value={scoreFilter}
                  >
                    <option value="all">All score bands</option>
                    <option value="strong">Strong</option>
                    <option value="moderate">Moderate</option>
                    <option value="weak">Weak</option>
                  </Select>
                  <label className={styles.filterCheck}>
                    <input
                      checked={evidenceOnly}
                      onChange={(event) => setEvidenceOnly(event.target.checked)}
                      type="checkbox"
                    />
                    <span>Only evidence-backed</span>
                  </label>
                </div>

                {visibleError ? (
                  <ErrorState message={visibleError} title="Resolution unavailable" />
                ) : null}
                {selectedIsStale ? (
                  <div className={styles.staleSelection} role="status">
                    <Badge tone="warning">Selection needs review</Badge>
                    <p>
                      <code>{selectedId}</code> conflicts with the current
                      architecture evidence. Clear it or choose a compatible option.
                    </p>
                  </div>
                ) : null}

                {loading ? (
                  <div className={styles.loadingList}>
                    <Skeleton label={`Loading ${kind} candidates`} />
                    <Skeleton label="Loading candidate evidence" />
                    <Skeleton label="Loading candidate tradeoffs" />
                  </div>
                ) : result && result.candidates.length === 0 ? (
                  <EmptyState
                    message={
                      result.conflicts.find(
                        ({ candidateId }) => candidateId === null,
                      )?.message ??
                      "Change the current constraints or earlier resolution levels to continue."
                    }
                    title="No compatible options"
                  />
                ) : candidates.length === 0 ? (
                  <EmptyState
                    message="Adjust the score or evidence filter to see available candidates."
                    title="No candidates match these filters"
                  />
                ) : (
                  <div className={styles.candidateList}>
                    {candidates.map((candidate, index) => {
                      const isSelected = candidate.candidateId === selectedId;
                      const isOpen = candidate.candidateId === openCandidateId;
                      return (
                        <article
                          className={styles.candidate}
                          data-selected={isSelected || undefined}
                          key={candidate.candidateId}
                        >
                          <div className={styles.candidateHeader}>
                            <div>
                              <div className={styles.candidateBadges}>
                                {index === 0 ? (
                                  <Badge tone="success">Recommended</Badge>
                                ) : (
                                  <Badge tone="neutral">Alternative</Badge>
                                )}
                                {isSelected ? (
                                  <Badge tone="info">Selected</Badge>
                                ) : null}
                                <Badge tone={candidate.scoreBand === "strong" ? "success" : candidate.scoreBand === "moderate" ? "warning" : "neutral"}>
                                  {candidate.scoreBand} evidence
                                </Badge>
                              </div>
                              <h4>{candidate.label}</h4>
                              <code>{candidate.candidateId}</code>
                            </div>
                            <div className={styles.score} aria-label={`Rank ${index + 1}, score ${candidate.score}`}>
                              <small>Rank {index + 1}</small>
                              <strong>{candidate.score}</strong>
                            </div>
                          </div>
                          <div className={styles.candidateActions}>
                            <Button
                              aria-expanded={isOpen}
                              onClick={() =>
                                setOpenCandidateId(
                                  isOpen ? null : candidate.candidateId,
                                )
                              }
                              size="compact"
                              variant="ghost"
                            >
                              {isOpen ? "Hide evidence" : "Review evidence"}
                            </Button>
                            <Button
                              busy={applyingId === candidate.candidateId}
                              disabled={isSelected}
                              onClick={() => void apply(candidate.candidateId)}
                              size="compact"
                            >
                              {isSelected ? "Applied" : `Apply ${LEVEL_PRESENTATION[kind].label.toLowerCase()}`}
                            </Button>
                          </div>
                          {isOpen ? <CandidateEvidence candidate={candidate} /> : null}
                        </article>
                      );
                    })}
                  </div>
                )}

                {blocked.length > 0 ? (
                  <details className={styles.blockedList}>
                    <summary>{blocked.length} blocked options</summary>
                    {blocked.map(([candidateId, conflicts]) => (
                      <div key={candidateId}>
                        <div>
                          <Badge tone="error">Blocked</Badge>
                          <code>{candidateId}</code>
                        </div>
                        <ul>
                          {conflicts.map((conflict) => (
                            <li key={`${conflict.code}-${conflict.message}`}>
                              {conflict.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </details>
                ) : null}
              </div>
            ) : null}
          </TabsPanel>
        ))}
      </Tabs>
    </div>
  );
}
