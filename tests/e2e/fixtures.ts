import { test as base } from "@playwright/test";

interface BrowserTool {
  readonly name: string;
  readonly execute: (
    input: object,
    options: { readonly signal: AbortSignal },
  ) => Promise<unknown>;
}

export const test = base.extend({
  page: async ({ page }, provide) => {
    await page.addInitScript(() => {
      const registered: Record<string, BrowserTool> = Object.create(null);
      Object.defineProperty(window, "__archforgeTools", {
        configurable: true,
        value: registered,
      });
      Object.defineProperty(document, "modelContext", {
        configurable: true,
        value: {
          async registerTool(tool: BrowserTool) {
            registered[tool.name] = tool;
          },
          async getTools() {
            return [];
          },
          async executeTool() {
            throw new Error("Tests invoke the registered page tool directly.");
          },
        },
      });
    });
    await provide(page);
  },
});

export { expect } from "@playwright/test";
