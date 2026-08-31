import { readFile } from "node:fs/promises";

import { expect, test } from "./fixtures";

test("the opt-in sample supports the documented accessible demo path", async ({
  page,
}) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page).toHaveTitle(
    "ArchForge — Provider-neutral architecture design",
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /provider-neutral system architectures/i,
  );
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    "href",
    /icon\.svg/,
  );

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", {
    name: "Skip to architecture workspace",
  });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();

  await page.getByRole("button", { name: "Load sample architecture" }).click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Resilient checkout platform",
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Architecture totals")).toContainText(
    "5 components",
  );
  await expect(page.getByLabel("Architecture totals")).toContainText(
    "4 connections",
  );
  await page.getByRole("button", { name: "Inputs" }).click();
  const inputDialog = page.getByRole("dialog", { name: "Design inputs" });
  await expect(inputDialog.getByText("Saved (3)")).toBeVisible();
  await inputDialog.getByRole("button", { name: "Close" }).click();

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(1);

  const violations = await page.evaluate(() => {
    const visible = (element: Element) => {
      const style = getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden";
    };
    const findings: string[] = [];
    const ids = new Set<string>();
    document.querySelectorAll<HTMLElement>("[id]").forEach((element) => {
      if (ids.has(element.id)) findings.push(`Duplicate id: ${element.id}`);
      ids.add(element.id);
    });
    document.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
      if (!visible(button)) return;
      const name =
        button.getAttribute("aria-label") ??
        button.getAttribute("aria-labelledby") ??
        button.textContent?.trim();
      if (!name) findings.push("Visible button has no accessible name.");
    });
    document
      .querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        "input, select, textarea",
      )
      .forEach((control) => {
        if (!visible(control)) return;
        const named =
          (control.labels?.length ?? 0) > 0 ||
          Boolean(control.getAttribute("aria-label")) ||
          Boolean(control.getAttribute("aria-labelledby"));
        if (!named) findings.push(`${control.tagName} has no accessible label.`);
      });
    document.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
      if (visible(image) && !image.hasAttribute("alt")) {
        findings.push("Visible image has no alt attribute.");
      }
    });
    if (document.querySelectorAll("h1").length !== 1) {
      findings.push("The rendered workspace must have exactly one h1.");
    }
    if (!document.querySelector("main#main-content")) {
      findings.push("The skip-link target is missing.");
    }
    return findings;
  });
  expect(violations).toEqual([]);

  const motionIsReduced = await page
    .getByRole("button", { name: "Download" })
    .evaluate((element) =>
      getComputedStyle(element)
        .transitionDuration.split(",")
        .every((duration) => {
          const trimmed = duration.trim();
          const milliseconds = trimmed.endsWith("ms")
            ? Number.parseFloat(trimmed)
            : Number.parseFloat(trimmed) * 1000;
          return milliseconds <= 0.01;
        }),
    );
  expect(motionIsReduced).toBe(true);

  await page.getByLabel("Export format").selectOption("json");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /resilient-checkout-platform-r\d+\.json/,
  );
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const exported = JSON.parse(await readFile(downloadPath!, "utf8")) as {
    name: string;
    components: readonly unknown[];
  };
  expect(exported.name).toBe("Resilient checkout platform");
  expect(exported.components).toHaveLength(5);

  await page.reload();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Resilient checkout platform",
    }),
  ).toBeVisible();
  expect(browserErrors).toEqual([]);
});
