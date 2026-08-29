"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import type { ArchitectureCommand } from "@/application/commands";
import {
  ArchitectureCommandService,
  ArchitectureService,
} from "@/application/services";
import type { Architecture } from "@/domain/architecture";
import {
  CryptoIdGenerator,
  IndexedDbArchitectureRepository,
  SystemClock,
} from "@/infrastructure";

interface ArchitectureWorkspaceContextValue {
  readonly architecture: Architecture | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly createArchitecture: (
    name: string,
    description?: string,
  ) => Promise<Architecture>;
  readonly dispatchCommand: (command: ArchitectureCommand) => Promise<void>;
}

const ArchitectureWorkspaceContext =
  createContext<ArchitectureWorkspaceContextValue | null>(null);

export function ArchitectureProvider({ children }: { readonly children: ReactNode }) {
  const services = useMemo(() => {
    const repository = new IndexedDbArchitectureRepository();
    const clock = new SystemClock();
    return {
      repository,
      architectureService: new ArchitectureService(
        repository,
        clock,
        new CryptoIdGenerator(),
      ),
      commandService: new ArchitectureCommandService(repository, clock),
    };
  }, []);
  const [architecture, setArchitecture] = useState<Architecture | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void services.architectureService
      .list()
      .then((architectures) => {
        if (active) setArchitecture(architectures[0] ?? null);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Saved architectures could not be loaded.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      services.repository.close();
    };
  }, [services]);

  const createNewArchitecture = useCallback(
    async (name: string, description?: string) => {
      setError(null);
      const created = await services.architectureService.create({
        name,
        description,
      });
      setArchitecture(created);
      return created;
    },
    [services],
  );

  const dispatchCommand = useCallback(
    async (command: ArchitectureCommand) => {
      setError(null);
      const updated = await services.commandService.execute(command);
      setArchitecture(updated);
    },
    [services],
  );

  const value = useMemo<ArchitectureWorkspaceContextValue>(
    () => ({
      architecture,
      loading,
      error,
      createArchitecture: createNewArchitecture,
      dispatchCommand,
    }),
    [architecture, createNewArchitecture, dispatchCommand, error, loading],
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
