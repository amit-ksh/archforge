"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import type { ArchitectureCommand } from "@/application/commands";
import type { ValidationIssue } from "@/application/contracts";
import { ArchitectureRepositoryError } from "@/application/ports";
import {
  ArchitectureCommandService,
  ArchitectureService,
  ResolutionService,
  ValidationService,
} from "@/application/services";
import type { Architecture, EntityId } from "@/domain/architecture";
import type { CapabilityDefinition } from "@/domain/catalog";
import type {
  ResolutionCandidateKind,
  ResolutionResult,
} from "@/domain/resolution";
import { ResolutionEngine } from "@/domain/resolution";
import { ValidationEngine } from "@/domain/validation";
import { ActivityStore } from "@/features/activity";
import {
  ArchitectureExportEngine,
  CryptoIdGenerator,
  IndexedDbArchitectureRepository,
  StaticComponentCatalog,
  StaticProviderCatalog,
  SystemClock,
} from "@/infrastructure";
import {
  createAnalysisExportTools,
  createArchitectureRequirementTools,
  createDesignTools,
  createResolutionToolSet,
  createWebMcpRegistrar,
} from "@/webmcp";

export interface WorkspaceError {
  readonly message: string;
  readonly retryable: boolean;
}

interface ArchitectureWorkspaceContextValue {
  readonly architecture: Architecture | null;
  readonly architectures: readonly Architecture[];
  readonly capabilities: readonly CapabilityDefinition[];
  readonly loading: boolean;
  readonly error: WorkspaceError | null;
  readonly validationIssues: readonly ValidationIssue[];
  readonly validationLoading: boolean;
  readonly validationError: WorkspaceError | null;
  readonly activityStore: ActivityStore;
  readonly createArchitecture: (
    name: string,
    description?: string,
  ) => Promise<Architecture>;
  readonly loadArchitecture: (id: EntityId) => Promise<void>;
  readonly reloadArchitectures: () => Promise<void>;
  readonly refreshValidation: () => Promise<void>;
  readonly suggestResolution: (
    componentId: EntityId,
    candidateKind: ResolutionCandidateKind,
  ) => Promise<ResolutionResult>;
  readonly setResolution: (
    componentId: EntityId,
    candidateKind: ResolutionCandidateKind,
    candidateId: EntityId | null,
  ) => Promise<void>;
  readonly nextId: (prefix: string) => EntityId;
  readonly dispatchCommand: (command: ArchitectureCommand) => Promise<void>;
}

const ArchitectureWorkspaceContext =
  createContext<ArchitectureWorkspaceContextValue | null>(null);

function toWorkspaceError(cause: unknown, fallback: string): WorkspaceError {
  if (cause instanceof ArchitectureRepositoryError) {
    return { message: cause.message, retryable: cause.retryable };
  }
  return {
    message: cause instanceof Error ? cause.message : fallback,
    retryable: false,
  };
}

function isAbortError(cause: unknown): boolean {
  return cause instanceof Error && cause.name === "AbortError";
}

export function ArchitectureProvider({ children }: { readonly children: ReactNode }) {
  const services = useMemo(() => {
    const repository = new IndexedDbArchitectureRepository();
    const clock = new SystemClock();
    const idGenerator = new CryptoIdGenerator();
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
      new ValidationEngine(
        componentCatalog,
        providerCatalog,
        resolutionEngine,
      ),
    );
    const exporter = new ArchitectureExportEngine();
    const activityStore = new ActivityStore();
    const sharedDependencies = {
      architectureService,
      commandService,
      componentCatalog,
      idGenerator,
      resolutionService,
      validationService,
      exporter,
    };
    const webMcpTools = [
      ...createArchitectureRequirementTools(sharedDependencies),
      ...createDesignTools(sharedDependencies),
      ...createResolutionToolSet(sharedDependencies),
      ...createAnalysisExportTools(sharedDependencies),
    ];
    return {
      repository,
      clock,
      idGenerator,
      capabilities: componentCatalog.listCapabilities(),
      architectureService,
      commandService,
      resolutionService,
      validationService,
      exporter,
      activityStore,
      webMcpTools,
    };
  }, []);
  const [architectures, setArchitectures] = useState<readonly Architecture[]>([]);
  const [architecture, setArchitecture] = useState<Architecture | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<WorkspaceError | null>(null);
  const [validationIssues, setValidationIssues] = useState<
    readonly ValidationIssue[]
  >([]);
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationError, setValidationError] = useState<WorkspaceError | null>(
    null,
  );
  const webMcpRegistrar = useRef<
    ReturnType<typeof createWebMcpRegistrar> | null
  >(null);

  const validate = useCallback(
    async (architectureId: EntityId) => {
      setValidationLoading(true);
      setValidationError(null);
      try {
        setValidationIssues(
          await services.validationService.validate(architectureId),
        );
      } catch (cause) {
        setValidationError(
          toWorkspaceError(cause, "Architecture validation could not complete."),
        );
      } finally {
        setValidationLoading(false);
      }
    },
    [services],
  );

  const reloadArchitectures = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loaded = await services.architectureService.list();
      const selected =
        loaded.find(({ id }) => id === architecture?.id) ?? loaded[0] ?? null;
      setArchitectures(loaded);
      setArchitecture(selected);
      if (selected) {
        await validate(selected.id);
      } else {
        setValidationIssues([]);
        setValidationError(null);
      }
    } catch (cause) {
      setError(
        toWorkspaceError(cause, "Saved architectures could not be loaded."),
      );
    } finally {
      setLoading(false);
    }
  }, [architecture?.id, services, validate]);

  useEffect(() => {
    let active = true;
    void services.architectureService
      .list()
      .then(async (loaded) => {
        if (!active) return;
        const current = loaded[0] ?? null;
        setArchitectures(loaded);
        setArchitecture(current);
        if (current) await validate(current.id);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            toWorkspaceError(cause, "Saved architectures could not be loaded."),
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      services.repository.close();
      services.exporter.dispose();
    };
  }, [services, validate]);

  useEffect(() => {
    const registrar =
      webMcpRegistrar.current ??
      createWebMcpRegistrar({
        clock: services.clock,
        idGenerator: services.idGenerator,
        activitySink: services.activityStore,
        document,
      });
    webMcpRegistrar.current = registrar;
    void registrar.register(services.webMcpTools).catch((cause: unknown) => {
      if (isAbortError(cause)) return;
      const correlationId = services.idGenerator.next("webmcp-registration");
      const message = "WebMCP tools could not be registered in this browser.";
      services.activityStore.record({
        correlationId,
        toolName: "webmcp_registration",
        toolTitle: "WebMCP registration",
        behavior: "read",
        status: "failed",
        summary: message,
        timestamp: services.clock.now(),
        affectedIds: [],
        error: {
          code: "WEBMCP_REGISTRATION_ERROR",
          message,
          retryable: true,
          correlationId,
        },
      });
    });
  }, [services]);

  useEffect(
    () =>
      services.activityStore.subscribe((event) => {
        if (
          !event ||
          event.behavior !== "mutation" ||
          event.status !== "succeeded"
        ) {
          return;
        }
        const selectedArchitectureId = architecture?.id ?? null;
        void services.architectureService.list().then(async (loaded) => {
          const selected =
            loaded.find(({ id }) => id === selectedArchitectureId) ??
            loaded[0] ??
            null;
          setArchitectures(loaded);
          setArchitecture(selected);
          if (selected) await validate(selected.id);
        });
      }),
    [architecture?.id, services, validate],
  );

  const createNewArchitecture = useCallback(
    async (name: string, description?: string) => {
      setError(null);
      try {
        const created = await services.architectureService.create({
          name,
          description,
        });
        setArchitectures((current) => [
          created,
          ...current.filter(({ id }) => id !== created.id),
        ]);
        setArchitecture(created);
        await validate(created.id);
        return created;
      } catch (cause) {
        setError(
          toWorkspaceError(cause, "The architecture could not be created."),
        );
        throw cause;
      }
    },
    [services, validate],
  );

  const loadArchitecture = useCallback(
    async (id: EntityId) => {
      setLoading(true);
      setError(null);
      try {
        const loaded = await services.architectureService.get(id);
        if (!loaded) throw new Error("The selected architecture was not found.");
        setArchitecture(loaded);
        await validate(loaded.id);
      } catch (cause) {
        setError(
          toWorkspaceError(cause, "The architecture could not be loaded."),
        );
        throw cause;
      } finally {
        setLoading(false);
      }
    },
    [services, validate],
  );

  const dispatchCommand = useCallback(
    async (command: ArchitectureCommand) => {
      setError(null);
      try {
        const updated = await services.commandService.execute(command);
        setArchitecture(updated);
        setArchitectures((current) => [
          updated,
          ...current.filter(({ id }) => id !== updated.id),
        ]);
        await validate(updated.id);
      } catch (cause) {
        setError(
          toWorkspaceError(cause, "The architecture change could not be saved."),
        );
        throw cause;
      }
    },
    [services, validate],
  );

  const refreshValidation = useCallback(async () => {
    if (architecture) await validate(architecture.id);
  }, [architecture, validate]);

  const suggestResolution = useCallback(
    async (
      componentId: EntityId,
      candidateKind: ResolutionCandidateKind,
    ) => {
      if (!architecture) {
        throw new Error("Select an architecture before resolving a component.");
      }
      return services.resolutionService.suggest({
        architectureId: architecture.id,
        componentId,
        candidateKind,
      });
    },
    [architecture, services],
  );

  const setResolution = useCallback(
    async (
      componentId: EntityId,
      candidateKind: ResolutionCandidateKind,
      candidateId: EntityId | null,
    ) => {
      if (!architecture) {
        throw new Error("Select an architecture before resolving a component.");
      }
      const command =
        candidateKind === "technology"
          ? {
              type: "resolution.set-technology" as const,
              architectureId: architecture.id,
              componentId,
              technologyId: candidateId,
            }
          : candidateKind === "provider"
            ? {
                type: "resolution.set-provider" as const,
                architectureId: architecture.id,
                componentId,
                providerId: candidateId,
              }
            : {
                type: "resolution.set-cloud-service" as const,
                architectureId: architecture.id,
                componentId,
                cloudServiceId: candidateId,
              };
      const result = await services.resolutionService.execute(command);
      if (!result.ok) throw new Error(result.error.message);
      const updated = result.value;
      setArchitecture(updated);
      setArchitectures((current) => [
        updated,
        ...current.filter(({ id }) => id !== updated.id),
      ]);
      await validate(updated.id);
    },
    [architecture, services, validate],
  );

  const nextId = useCallback(
    (prefix: string) => services.idGenerator.next(prefix),
    [services],
  );

  const value = useMemo<ArchitectureWorkspaceContextValue>(
    () => ({
      architecture,
      architectures,
      capabilities: services.capabilities,
      loading,
      error,
      validationIssues,
      validationLoading,
      validationError,
      activityStore: services.activityStore,
      createArchitecture: createNewArchitecture,
      loadArchitecture,
      reloadArchitectures,
      refreshValidation,
      suggestResolution,
      setResolution,
      nextId,
      dispatchCommand,
    }),
    [
      architecture,
      architectures,
      createNewArchitecture,
      dispatchCommand,
      error,
      loadArchitecture,
      loading,
      nextId,
      refreshValidation,
      reloadArchitectures,
      services.capabilities,
      services.activityStore,
      setResolution,
      suggestResolution,
      validationError,
      validationIssues,
      validationLoading,
    ],
  );

  return (
    <ArchitectureWorkspaceContext value={value}>
      {children}
    </ArchitectureWorkspaceContext>
  );
}

export function useArchitectureWorkspace() {
  const context = useContext(ArchitectureWorkspaceContext);
  if (!context) {
    throw new Error(
      "useArchitectureWorkspace must be used inside ArchitectureProvider.",
    );
  }
  return context;
}
