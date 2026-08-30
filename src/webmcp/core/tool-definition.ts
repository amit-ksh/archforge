import { z } from "zod";

import type { MutationSummary } from "@/application/contracts";

import type { WebMcpToolBehavior } from "./activity";

export interface WebMcpToolExecutionContext {
  readonly correlationId: string;
}

export interface WebMcpToolHandlerResult<TValue> {
  readonly value: TValue;
  readonly summary: string;
  readonly mutation?: MutationSummary;
}

export interface WebMcpToolDefinition {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly behavior: WebMcpToolBehavior;
  readonly inputSchema: z.ZodType;
  readonly outputSchema: z.ZodType;
  execute(
    input: unknown,
    context: WebMcpToolExecutionContext,
  ): Promise<WebMcpToolHandlerResult<unknown>>;
}

export interface DefineWebMcpToolOptions<
  TInputSchema extends z.ZodType,
  TOutputSchema extends z.ZodType,
> {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly behavior: WebMcpToolBehavior;
  readonly inputSchema: TInputSchema;
  readonly outputSchema: TOutputSchema;
  readonly handler: (
    input: z.output<TInputSchema>,
    context: WebMcpToolExecutionContext,
  ) => Promise<WebMcpToolHandlerResult<z.input<TOutputSchema>>>;
}

export function defineWebMcpTool<
  TInputSchema extends z.ZodType,
  TOutputSchema extends z.ZodType,
>(
  options: DefineWebMcpToolOptions<TInputSchema, TOutputSchema>,
): WebMcpToolDefinition {
  return {
    name: options.name,
    title: options.title,
    description: options.description,
    behavior: options.behavior,
    inputSchema: options.inputSchema,
    outputSchema: options.outputSchema,
    async execute(input, context) {
      return options.handler(options.inputSchema.parse(input), context);
    },
  };
}
