import "@testing-library/jest-dom/vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Each test file gets an isolated, freshly-seeded datastore.
process.env.RITIM_DB_PATH = join(mkdtempSync(join(tmpdir(), "ritim-test-")), "db.json");
