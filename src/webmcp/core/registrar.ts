import { z } from "zod";

import type {
  WebMcpBrowserTool,
  WebMcpModelContext,
} from "./browser-api";
import type { WebMcpToolDefinition } from "./tool-definition";
import type { WebMcpToolRuntime } from "./tool-runtime";

export interface WebMcpRegistrationResult {
  readonly supported: boolean;
  readonly registeredNames: readonly string[];
}

export class WebMcpRegistrar {
  private controller: AbortController | null = null;
  private registration: Promise<WebMcpRegistrationResult> | null = null;
  private registeredNames: readonly string[] = [];

  constructor(
    private readonly modelContext: WebMcpModelContext | null,
    private readonly runtime: WebMcpToolRuntime,
  ) {}

  register(
    definitions: readonly WebMcpToolDefinition[],
  ): Promise<WebMcpRegistrationResult> {
    if (!this.modelContext) {
      return Promise.resolve({ supported: false, registeredNames: [] });
    }
    if (this.controller && !this.controller.signal.aborted) {
      return Promise.resolve({
        supported: true,
        registeredNames: this.registeredNames,
      });
    }
    if (this.registration) return this.registration;

    this.registration = this.registerDefinitions(definitions).finally(() => {
      this.registration = null;
    });
    return this.registration;
  }

  dispose(): void {
    this.controller?.abort();
    this.controller = null;
    this.registeredNames = [];
  }

  private async registerDefinitions(
    definitions: readonly WebMcpToolDefinition[],
  ): Promise<WebMcpRegistrationResult> {
    const duplicateNames = definitions.filter(
      ({ name }, index) =>
        definitions.findIndex((tool) => tool.name === name) !== index,
    );
    if (duplicateNames.length > 0) {
      throw new Error(
        `Duplicate WebMCP tool name '${duplicateNames[0].name}' cannot be registered.`,
      );
    }

    const controller = new AbortController();
    this.controller = controller;
    try {
      for (const definition of definitions) {
        await this.modelContext?.registerTool(
          this.toBrowserTool(definition),
          { signal: controller.signal },
        );
      }
      this.registeredNames = definitions.map(({ name }) => name);
      return {
        supported: true,
        registeredNames: this.registeredNames,
      };
    } catch (error) {
      controller.abort();
      this.controller = null;
      this.registeredNames = [];
      throw error;
    }
  }

  private toBrowserTool(definition: WebMcpToolDefinition): WebMcpBrowserTool {
    return {
      name: definition.name,
      title: definition.title,
      description: definition.description,
      inputSchema: z.toJSONSchema(definition.inputSchema),
      annotations: {
        readOnlyHint: definition.behavior === "read",
        untrustedContentHint: false,
      },
      execute: async (input) => this.runtime.invoke(definition, input),
    };
  }
}
