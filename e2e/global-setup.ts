import { rmSync } from "node:fs";
import { join } from "node:path";

/** Start every E2E run from a freshly-seeded datastore. */
export default function globalSetup() {
  rmSync(join(process.cwd(), ".data", "e2e-db.json"), { force: true });
}
