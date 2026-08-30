export interface WebMcpToolAnnotations {
  readonly readOnlyHint?: boolean;
  readonly untrustedContentHint?: boolean;
}

export interface WebMcpExecuteOptions {
  readonly signal: AbortSignal;
}

export interface WebMcpBrowserTool {
  readonly name: string;
  readonly title?: string;
  readonly description: string;
  readonly inputSchema?: object;
  readonly annotations?: WebMcpToolAnnotations;
  readonly execute: (
    input: object,
    options: WebMcpExecuteOptions,
  ) => Promise<unknown>;
}

export interface WebMcpRegisteredTool {
  readonly name: string;
  readonly title?: string;
  readonly description: string;
  readonly inputSchema?: object;
  readonly window: Window;
  readonly origin: string;
  readonly annotations?: WebMcpToolAnnotations;
}

export interface WebMcpModelContext {
  registerTool(
    tool: WebMcpBrowserTool,
    options?: {
      readonly exposedTo?: readonly string[];
      readonly signal?: AbortSignal;
    },
  ): Promise<void>;
  getTools(options?: {
    readonly fromOrigins?: readonly string[];
  }): Promise<readonly WebMcpRegisteredTool[]>;
  executeTool(
    tool: WebMcpRegisteredTool,
    input?: object,
    options?: { readonly signal?: AbortSignal },
  ): Promise<string>;
}

declare global {
  interface Document {
    readonly modelContext?: WebMcpModelContext;
  }
}
