import { readFile } from "node:fs/promises";

import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

interface ToolSuccess {
  readonly ok: true;
  readonly contractVersion: 1;
  readonly value: Record<string, unknown>;
  readonly mutation?: {
    readonly architectureId: string;
    readonly revision: number;
  };
}

interface ToolFailure {
  readonly ok: false;
  readonly contractVersion: 1;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly correlationId: string;
  };
}

type ToolEnvelope = ToolSuccess | ToolFailure;

async function waitForTool(page: Page, name: string) {
  await page.waitForFunction(
    (toolName) =>
      Boolean(
        (window as Window & {
          __archforgeTools?: Record<string, unknown>;
        }).__archforgeTools?.[toolName],
      ),
    name,
  );
}

async function invokeTool(
  page: Page,
  name: string,
  input: object,
): Promise<ToolEnvelope> {
  await waitForTool(page, name);
  return page.evaluate(
    async ({ toolName, toolInput }) => {
      const registry = (
        window as unknown as Window & {
          __archforgeTools: Record<
            string,
            {
              execute: (
                input: object,
                options: { signal: AbortSignal },
              ) => Promise<ToolEnvelope>;
            }
          >;
        }
      ).__archforgeTools;
      return registry[toolName]!.execute(toolInput, {
        signal: new AbortController().signal,
      });
    },
    { toolName: name, toolInput: input },
  );
}

async function createArchitecture(page: Page, name: string) {
  await page.getByLabel("Architecture name").fill(name);
  await page
    .getByLabel("Description")
    .fill("Critical journey architecture persisted in this browser only.");
  await page.getByRole("button", { name: "Create architecture" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

test("local design persists through reload and exports a validated snapshot", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1200 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Shape the system before choosing the stack.",
    }),
  ).toBeVisible();
  await createArchitecture(page, "Checkout platform");

  const requirements = page.getByRole("tabpanel", { name: "Requirements" });
  await requirements
    .getByLabel("Statement")
    .fill("Checkout remains available through a zonal failure.");
  await requirements.getByLabel("Category").selectOption("reliability");
  await requirements.getByLabel("Priority").selectOption("critical");
  await requirements.getByLabel("Target").fill("99.95% monthly availability");
  await requirements.getByRole("button", { name: "Add requirement" }).click();
  await expect(requirements.getByText("Saved (1)")).toBeVisible();

  await page.getByRole("tab", { name: "Library" }).click();
  const library = page.getByRole("tabpanel", { name: "Library" });
  await library
    .getByRole("article")
    .filter({ hasText: "API" })
    .getByRole("button", { name: "Add to canvas" })
    .click();
  await library
    .getByRole("article")
    .filter({ hasText: "Relational database" })
    .getByRole("button", { name: "Add to canvas" })
    .click();
  await expect(page.getByLabel("Architecture totals")).toContainText(
    "2 components",
  );

  await page.getByRole("tab", { name: "Connections" }).click();
  const connections = page.getByRole("tabpanel", { name: "Connections" });
  await connections.getByLabel("Source").selectOption({ label: "API" });
  await connections
    .getByLabel("Target")
    .selectOption({ label: "Relational database" });
  await connections.getByLabel("Relationship").selectOption("data");
  await connections.getByLabel("Label").fill("stores checkout records");
  await connections
    .getByRole("button", { name: "Connect components" })
    .click();
  await expect(page.getByLabel("Architecture totals")).toContainText(
    "1 connection",
  );

  await page
    .getByRole("button", { name: "API, capability-api", exact: true })
    .click();
  await page.getByRole("tab", { name: "Resolution", exact: true }).click();
  await page.getByRole("tab", { name: "Technology" }).click();
  const nodeCandidate = page
    .getByRole("article")
    .filter({ hasText: "technology-nodejs" });
  await expect(nodeCandidate).toBeVisible();
  await nodeCandidate.getByRole("button", { name: "Apply technology" }).click();
  await expect(page.getByLabel("Resolution trail")).toContainText(
    "technology-nodejs",
  );

  const architectureId = await page
    .getByLabel("Current architecture")
    .inputValue();
  const downloadPromise = page.waitForEvent("download");
  const exportResult = await page.evaluate(async (id) => {
    const registry = (
      window as unknown as Window & {
        __archforgeTools: Record<
          string,
          {
            execute: (
              input: object,
              options: { signal: AbortSignal },
            ) => Promise<ToolEnvelope>;
          }
        >;
      }
    ).__archforgeTools;
    const result = await registry.export_json!.execute(
      {
        contractVersion: 1,
        requestId: "e2e-export",
        payload: { architectureId: id },
      },
      { signal: new AbortController().signal },
    );
    if (!result.ok) return result;
    const value = result.value as {
      data: string;
      filename: string;
      mediaType: string;
    };
    const anchor = document.createElement("a");
    anchor.download = value.filename;
    anchor.href = URL.createObjectURL(
      new Blob([value.data], { type: value.mediaType }),
    );
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    return result;
  }, architectureId);
  expect(exportResult.ok).toBe(true);
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/checkout-platform-r\d+\.json/);
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  expect(await readFile(downloadPath!, "utf8")).toContain(architectureId);

  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: "Checkout platform" }),
  ).toBeVisible();
  await expect(page.getByLabel("Architecture totals")).toContainText(
    "2 components",
  );
  await expect(page.getByLabel("Architecture totals")).toContainText(
    "1 connection",
  );
  await expect(page.getByText("Saved (1)")).toBeVisible();
  await page.getByRole("tab", { name: "AI activity" }).click();
  await expect(
    page.getByRole("heading", { level: 3, name: "No AI activity yet" }),
  ).toBeVisible();

  const persistedKeys = await page.evaluate(async (id) => {
    const request = indexedDB.open("archforge", 1);
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const recordRequest = database
      .transaction("architectures", "readonly")
      .objectStore("architectures")
      .get(id);
    const record = await new Promise<Record<string, unknown>>(
      (resolve, reject) => {
        recordRequest.onsuccess = () => resolve(recordRequest.result);
        recordRequest.onerror = () => reject(recordRequest.error);
      },
    );
    database.close();
    return Object.keys(record).sort();
  }, architectureId);
  expect(persistedKeys).not.toEqual(
    expect.arrayContaining(["activity", "selection", "viewport"]),
  );
});

test("an available WebMCP agent designs visibly and failures retain recovery context", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const designed = await invokeTool(page, "design_system", {
    contractVersion: 1,
    requestId: "e2e-agent-design",
    payload: {
      metadata: {
        name: "Agent-designed system",
        description: "Created through the registered WebMCP workflow.",
      },
      requirements: [],
      constraints: [],
      components: [
        {
          key: "api",
          capabilityId: "capability-api",
          name: "Public API",
        },
      ],
      connections: [],
      resolutions: [],
    },
  });
  expect(designed.ok).toBe(true);
  await expect(
    page.getByRole("heading", { level: 1, name: "Agent-designed system" }),
  ).toBeVisible();

  await page.getByRole("tab", { name: "AI activity" }).click();
  const designActivity = page
    .getByRole("list", { name: "AI activity history" })
    .getByRole("article")
    .filter({ hasText: "Design system" })
    .first();
  await expect(designActivity).toContainText("Succeeded");
  await expect(designActivity).toContainText("AI / WebMCP");

  const failed = await invokeTool(page, "design_system", {
    contractVersion: 1,
    requestId: "e2e-invalid-design",
    payload: {
      metadata: { name: "Invalid design" },
      requirements: [],
      constraints: [],
      components: [
        {
          key: "unknown",
          capabilityId: "capability-unknown",
          name: "Unknown capability",
        },
      ],
      connections: [],
      resolutions: [],
    },
  });
  expect(failed).toMatchObject({
    ok: false,
    error: {
      code: "VALIDATION_ERROR",
      correlationId: "e2e-invalid-design",
    },
  });
  const failedActivity = page
    .getByRole("list", { name: "AI activity history" })
    .getByRole("article")
    .filter({ hasText: "Design-system workflow preflight failed" })
    .first();
  await expect(failedActivity).toContainText("Failed");

  const failedExport = await invokeTool(page, "export_json", {
    contractVersion: 1,
    requestId: "e2e-failed-export",
    payload: { architectureId: "architecture-missing" },
  });
  expect(failedExport).toMatchObject({
    ok: false,
    error: { code: "NOT_FOUND", correlationId: "e2e-failed-export" },
  });
  const exportActivity = page
    .getByRole("list", { name: "AI activity history" })
    .getByRole("article")
    .filter({ hasText: "Export JSON" })
    .first();
  await expect(exportActivity).toContainText("Failed");

  await expect(page.getByRole("button", { name: "Inputs" })).toBeVisible();
  await page.getByRole("button", { name: "Inputs" }).click();
  const inputDialog = page.getByRole("dialog", { name: "Design inputs" });
  const requirementsTab = inputDialog.getByRole("tab", {
    name: "Requirements",
  });
  await requirementsTab.focus();
  await requirementsTab.press("ArrowRight");
  await expect(
    inputDialog.getByRole("tab", { name: "Constraints" }),
  ).toHaveAttribute("aria-selected", "true");
  await inputDialog.getByRole("tab", { name: "Constraints" }).press("ArrowRight");
  await expect(inputDialog.getByRole("tab", { name: "Library" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("corrupt local records are removed explicitly without overwriting valid work", async ({
  page,
}) => {
  await page.goto("/");
  await createArchitecture(page, "Preserved architecture");

  await page.evaluate(async () => {
    const request = indexedDB.open("archforge", 1);
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction("architectures", "readwrite");
    transaction.objectStore("architectures").put({
      id: "corrupt-record",
      schemaVersion: 999,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    database.close();
  });

  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: "Workspace unavailable" }),
  ).toBeVisible();
  await expect(page.getByText("Stored architecture data failed runtime validation."))
    .toBeVisible();
  await page.getByRole("button", { name: "Remove unreadable data" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Preserved architecture" }),
  ).toBeVisible();

  const ids = await page.evaluate(async () => {
    const request = indexedDB.open("archforge", 1);
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const records = database
      .transaction("architectures", "readonly")
      .objectStore("architectures")
      .getAllKeys();
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      records.onsuccess = () => resolve(records.result);
      records.onerror = () => reject(records.error);
    });
    database.close();
    return keys.map(String);
  });
  expect(ids).toHaveLength(1);
  expect(ids).not.toContain("corrupt-record");
});
