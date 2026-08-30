import {
  ConnectionSchema,
  type MutationSummary,
} from "@/application/contracts";
import type { IdGenerator } from "@/application/ports";
import type {
  ArchitectureCommandService,
  ArchitectureService,
} from "@/application/services";
import {
  DomainError,
  type Architecture,
  type Connection,
} from "@/domain/architecture";
import { defineWebMcpTool } from "@/webmcp/core";

import {
  ConnectComponentsToolInputSchema,
  RemovedConnectionSchema,
  RemoveConnectionToolInputSchema,
  UpdateConnectionToolInputSchema,
} from "./schemas";

export interface ConnectionToolDependencies {
  readonly architectureService: ArchitectureService;
  readonly commandService: ArchitectureCommandService;
  readonly idGenerator: IdGenerator;
}

async function requireArchitecture(
  service: ArchitectureService,
  architectureId: string,
): Promise<Architecture> {
  const architecture = await service.get(architectureId);
  if (!architecture) {
    throw new DomainError(
      "ENTITY_NOT_FOUND",
      `Architecture '${architectureId}' was not found.`,
    );
  }
  return architecture;
}

function requireConnection(
  architecture: Architecture,
  connectionId: string,
): Connection {
  const connection = architecture.connections.find(
    ({ id }) => id === connectionId,
  );
  if (!connection) {
    throw new DomainError(
      "ENTITY_NOT_FOUND",
      `Connection '${connectionId}' was not found.`,
    );
  }
  return connection;
}

function mutation(
  architecture: Architecture,
  connectionId: string,
  summary: string,
): MutationSummary {
  return {
    behavior: "mutation",
    architectureId: architecture.id,
    revision: architecture.revision,
    affectedIds: [connectionId],
    summary,
  };
}

export function createConnectionTools(
  dependencies: ConnectionToolDependencies,
) {
  const { architectureService, commandService, idGenerator } = dependencies;
  return [
    defineWebMcpTool({
      name: "connect_components",
      title: "Connect components",
      description: "Create a directed semantic connection between components.",
      behavior: "mutation",
      inputSchema: ConnectComponentsToolInputSchema,
      outputSchema: ConnectionSchema,
      async handler({ payload }) {
        const connectionId = idGenerator.next("connection");
        const architecture = await commandService.execute({
          type: "connection.connect",
          architectureId: payload.architectureId,
          connection: {
            id: connectionId,
            ...payload.connection,
            label: payload.connection.label ?? "",
          },
        });
        const connection = requireConnection(architecture, connectionId);
        return {
          value: ConnectionSchema.parse(connection),
          summary: `Connected '${connection.sourceComponentId}' to '${connection.targetComponentId}'.`,
          mutation: mutation(
            architecture,
            connection.id,
            "Connected components.",
          ),
        };
      },
    }),
    defineWebMcpTool({
      name: "update_connection",
      title: "Update connection",
      description: "Update endpoints, relationship, or label on a connection.",
      behavior: "mutation",
      inputSchema: UpdateConnectionToolInputSchema,
      outputSchema: ConnectionSchema,
      async handler({ payload }) {
        const architecture = await commandService.execute({
          type: "connection.update",
          architectureId: payload.architectureId,
          connectionId: payload.connectionId,
          patch: payload.patch,
        });
        const connection = requireConnection(architecture, payload.connectionId);
        return {
          value: ConnectionSchema.parse(connection),
          summary: `Updated connection '${connection.id}'.`,
          mutation: mutation(
            architecture,
            connection.id,
            "Updated connection.",
          ),
        };
      },
    }),
    defineWebMcpTool({
      name: "remove_connection",
      title: "Remove connection",
      description: "Remove a connection from an architecture.",
      behavior: "mutation",
      inputSchema: RemoveConnectionToolInputSchema,
      outputSchema: RemovedConnectionSchema,
      async handler({ payload }) {
        const before = await requireArchitecture(
          architectureService,
          payload.architectureId,
        );
        const connection = requireConnection(before, payload.connectionId);
        const architecture = await commandService.execute({
          type: "connection.remove",
          architectureId: payload.architectureId,
          connectionId: payload.connectionId,
        });
        return {
          value: { removedConnectionId: connection.id },
          summary: `Removed connection '${connection.id}'.`,
          mutation: mutation(
            architecture,
            connection.id,
            "Removed connection.",
          ),
        };
      },
    }),
  ] as const;
}
