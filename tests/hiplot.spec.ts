import { test, expect } from "@playwright/test";

async function loadDemo(page) {
  if (process.env.PW_LOG) {
    page.on("console", (msg) => {
      console.log(`[console:${msg.type()}] ${msg.text()}`);
    });
    page.on("pageerror", (err) => {
      console.log(`[pageerror] ${err.message}`);
    });
  }
  await page.goto("/");
  await page.waitForFunction(() => (window as any).hiplot?.render, { timeout: 15000 });
  await expect(page.locator("#hiplot_element_id")).toBeVisible();
  await expect(page.locator(".hip_thm--light, .hip_thm--dark")).toBeVisible();
  const input = page.locator('textarea[placeholder="Experiments to load"]');
  await expect(input).toBeVisible();
  await input.fill("demo");
  await input.press("Enter");
  await page.waitForSelector("svg g.dimension", { state: "attached", timeout: 15000 });
  await expect(page.locator("text=Loading HiPlot...")).toHaveCount(0);
}

test("renders HiPlot on the default page", async ({ page }) => {
  await loadDemo(page);
});

test("datatable renders with rows", async ({ page }) => {
  await loadDemo(page);
  await expect(page.locator("table.sample-rows-table")).toBeVisible();
  const rowLocator = page.locator("table.sample-rows-table tbody tr");
  await expect.poll(async () => rowLocator.count(), { timeout: 20000 }).toBeGreaterThan(0);
});

test("respects hip.dark query parameter", async ({ page }) => {
  await page.goto("/?hip.dark=true");
  await expect(page.locator(".hip_thm--dark")).toBeVisible();

  await page.goto("/?hip.dark=false");
  await expect(page.locator(".hip_thm--light")).toBeVisible();
});

test("respects hip.dark=auto and tracks prefers-color-scheme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/?hip.dark=auto");
  await expect(page.locator(".hip_thm--dark")).toBeVisible();

  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator(".hip_thm--light")).toBeVisible();
});

test("ignores invalid hip.dark values", async ({ page }) => {
  await page.goto("/?hip.dark=banana");
  await expect(page.locator(".hip_thm--light")).toBeVisible();
});

test("context menu opens on axis label right-click", async ({ page }) => {
  await loadDemo(page);
  const label = page.locator(".pplot-label").first();
  await expect(label).toBeVisible();
  await label.click({ button: "right" });
  await expect(page.locator(".context-menu.show")).toBeVisible();
});

test("dragging an axis changes its position", async ({ page }) => {
  await loadDemo(page);
  const dims = page.locator("svg g.dimension");
  const dimCount = await dims.count();
  expect(dimCount).toBeGreaterThan(2);

  const initialTransforms = await page.$$eval("svg g.dimension", (els) =>
    els.map((el) => el.getAttribute("transform")),
  );

  // Drag a middle axis to avoid edge constraints
  const midIdx = Math.floor(dimCount / 2);
  const label = dims.nth(midIdx).locator(".pplot-label").first();
  const box = await label.boundingBox();
  if (box) {
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 320, startY, { steps: 16 });
    await page.mouse.up();
  }

  await expect
    .poll(async () => {
      const afterTransforms = await page.$$eval("svg g.dimension", (els) =>
        els.map((el) => el.getAttribute("transform")),
      );
      return afterTransforms.some((t, i) => t !== initialTransforms[i]);
    })
    .toBeTruthy();
});

test("rapidly dragging axes back and forth does not crash", async ({ page }) => {
  const errors: Error[] = [];
  page.on("pageerror", (err) => errors.push(err));

  await loadDemo(page);
  const dims = page.locator("svg g.dimension");
  const dimCount = await dims.count();
  expect(dimCount).toBeGreaterThan(2);

  // Pick a middle axis label to drag
  const midIdx = Math.floor(dimCount / 2);
  const label = dims.nth(midIdx).locator(".pplot-label").first();
  const box = await label.boundingBox();
  expect(box).toBeTruthy();

  const startX = box!.x + box!.width / 2;
  const startY = box!.y + box!.height / 2;

  // Perform several rapid back-and-forth drags.
  // Use minimal steps to create fastest possible event dispatch,
  // maximizing chances of React 19 batching drag/end setState calls.
  for (let round = 0; round < 5; round++) {
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Rapid zigzag across multiple columns
    for (let i = 0; i < 4; i++) {
      await page.mouse.move(startX + 350, startY, { steps: 2 });
      await page.mouse.move(startX - 250, startY, { steps: 2 });
    }
    await page.mouse.up();
    // No pause between rounds - start next drag immediately
  }

  // Give React time to flush any deferred state updates and callbacks
  await page.waitForTimeout(500);

  expect(errors).toEqual([]);
});

test("brushing an axis updates selection count", async ({ page }) => {
  await loadDemo(page);
  const countLine = page.locator('div[style*="monospace"]').first();
  const extractCounts = async () => {
    const text = (await countLine.textContent()) ?? "";
    const match = text.match(/Selected:\s*(\d+)\s*\/\s*(\d+)/);
    if (!match) return { selected: NaN, total: NaN };
    return { selected: parseInt(match[1], 10), total: parseInt(match[2], 10) };
  };
  const before = await extractCounts();

  const overlay = page.locator("svg g.dimension .pplot-brush rect.overlay").first();
  const box = await overlay.boundingBox();
  if (box) {
    const x = box.x + box.width / 2;
    const y1 = box.y + box.height * 0.25;
    const y2 = box.y + box.height * 0.75;
    await page.mouse.move(x, y1);
    await page.mouse.down();
    await page.mouse.move(x, y2, { steps: 12 });
    await page.mouse.up();
  }

  await expect
    .poll(async () => {
      const after = await extractCounts();
      return !Number.isNaN(after.selected) && after.selected !== before.selected;
    })
    .toBeTruthy();
});

test("hide and restore axis via context menu", async ({ page }) => {
  await loadDemo(page);
  const dims = page.locator("svg g.dimension");
  const countBefore = await dims.count();
  expect(countBefore).toBeGreaterThan(2);

  const label = page.locator(".pplot-label").first();
  await label.click({ button: "right" });
  await expect(page.locator(".context-menu.show")).toBeVisible();

  const hideItem = page.locator(".context-menu .dropdown-item", { hasText: "Hide axis" });
  await hideItem.click();

  await expect
    .poll(async () => await page.locator("svg g.dimension").count())
    .toBe(countBefore - 1);

  // Restore from header button if available
  const restoreButton = page.locator('button[title="Restore hidden columns in parallel plot"]');
  if (await restoreButton.count()) {
    await restoreButton.first().click();
    await expect.poll(async () => await page.locator("svg g.dimension").count()).toBe(countBefore);
  }
});

test("distribution switches axes on menu selection", async ({ page }) => {
  await loadDemo(page);
  const labels = page.locator(".pplot-label");
  await expect(labels.first()).toBeVisible();
  const labelTexts = await labels.evaluateAll((nodes) =>
    nodes.map((node) => {
      const textParts = Array.from(node.childNodes)
        .filter((child) => child.nodeType === Node.TEXT_NODE)
        .map((child) => (child.textContent || "").trim())
        .filter((text) => text.length > 0);
      return textParts.join(" ").trim();
    }),
  );
  const uniqueLabels = Array.from(new Set(labelTexts.filter((text) => text.length > 0)));
  expect(uniqueLabels.length).toBeGreaterThanOrEqual(2);
  const axis1 = uniqueLabels[0];
  const axis2 = uniqueLabels[1];
  const axis1Index = labelTexts.findIndex((text) => text === axis1);
  const axis2Index = labelTexts.findIndex((text) => text === axis2);
  expect(axis1Index).toBeGreaterThanOrEqual(0);
  expect(axis2Index).toBeGreaterThanOrEqual(0);

  await labels.nth(axis1Index).click({ button: "right" });
  await expect(page.locator(".context-menu.show")).toBeVisible();
  await page.locator(".context-menu .dropdown-item", { hasText: "View distribution" }).click();
  await expect(
    page.locator(`[data-testid="distribution-plot"][data-axis="${axis1}"]`),
  ).toBeVisible();

  await labels.nth(axis2Index).click({ button: "right" });
  await expect(page.locator(".context-menu.show")).toBeVisible();
  await page.locator(".context-menu .dropdown-item", { hasText: "View distribution" }).click();
  await expect(
    page.locator(`[data-testid="distribution-plot"][data-axis="${axis2}"]`),
  ).toBeVisible();
});
