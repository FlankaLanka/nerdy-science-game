import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5175",
    viewport: { width: 1280, height: 720 },
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      args: process.platform === "darwin" ? ["--use-angle=metal"] : [],
    },
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:5175",
    env: { PORT: "5175", OPENROUTER_API_KEY: "" },
    reuseExistingServer: false,
    timeout: 30000,
  },
});
