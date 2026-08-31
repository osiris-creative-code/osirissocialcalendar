import { defineConfig } from "@playwright/test";
import { join } from "node:path";

const PORT = 3210;
const DB_PATH = join(process.cwd(), ".data", "e2e-db.json");

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  globalSetup: "./e2e/global-setup.ts",
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    port: PORT,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      OSIRIS_TEAM_TOKEN: "osiris-dev",
      OSIRIS_DEV_PASSWORD: "dev",
      OSIRIS_DB_PATH: DB_PATH,
    },
  },
});
