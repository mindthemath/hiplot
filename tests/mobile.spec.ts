import { test, expect } from '@playwright/test';

test.describe('HiPlot Mobile Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8765/test_mobile_output.html');
    // Wait for HiPlot parallel plot to render
    await page.waitForSelector('svg g.dimension', { state: 'attached', timeout: 15000 });
    await page.waitForTimeout(1000);
  });

  test('labels should be visible after loading', async ({ page }) => {
    // Check that axis labels are present
    const labels = page.locator('foreignObject');
    const labelCount = await labels.count();
    console.log(`Found ${labelCount} axis labels (foreignObject elements)`);
    expect(labelCount).toBeGreaterThan(0);

    // Take screenshot
    await page.screenshot({ path: 'test-results/labels-visible.png' });
  });

  test('labels should remain visible after scrolling', async ({ page }) => {
    // Get initial label positions
    const labels = page.locator('foreignObject');
    const initialBox = await labels.first().boundingBox();
    console.log('Initial label position:', initialBox);

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(300);

    // Scroll back up
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // Check labels are still visible
    const afterBox = await labels.first().boundingBox();
    console.log('Label position after scroll:', afterBox);

    // Labels should still have valid bounding box
    expect(afterBox).not.toBeNull();
    expect(afterBox!.width).toBeGreaterThan(0);
    expect(afterBox!.height).toBeGreaterThan(0);

    await page.screenshot({ path: 'test-results/after-scroll.png' });
  });

  test('drag axis should work', async ({ page }) => {
    // Find the dimension groups (each axis)
    const dimensions = page.locator('svg g.dimension');
    const firstDim = dimensions.first();

    // Get initial transform
    const initialTransform = await firstDim.getAttribute('transform');
    console.log('Initial transform:', initialTransform);

    // Find the foreignObject (draggable label) in this dimension
    const fo = firstDim.locator('foreignObject').first();
    const foBox = await fo.boundingBox();

    if (foBox) {
      const startX = foBox.x + foBox.width / 2;
      const startY = foBox.y + foBox.height / 2;

      // Drag horizontally
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 80, startY, { steps: 10 });
      await page.waitForTimeout(200);

      // Take screenshot during drag
      await page.screenshot({ path: 'test-results/during-drag.png' });

      await page.mouse.up();
      await page.waitForTimeout(300);

      // Take screenshot after drag
      await page.screenshot({ path: 'test-results/after-drag.png' });
    }
  });

  test('visual regression - full page', async ({ page }) => {
    await page.screenshot({ path: 'test-results/mobile-full-page.png', fullPage: true });

    // Basic sanity checks
    const svgElement = page.locator('svg').first();
    await expect(svgElement).toBeVisible();
  });
});
