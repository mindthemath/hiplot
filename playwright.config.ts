import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: "http://127.0.0.1:8765",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command:
      "bash scripts/ensure-bundle.sh && uv run --extra server hiplot --port 8765 --host 0.0.0.0",
    url: "http://127.0.0.1:8765",
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
  },
});
