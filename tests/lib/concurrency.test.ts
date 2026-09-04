import { describe, it, expect, vi } from "vitest";
import { processInChunks } from "@/lib/concurrency";

describe("processInChunks", () => {
  it("processes everything and preserves per-item results", async () => {
    const items = [1, 2, 3, 4, 5, 6, 7];
    const results = await processInChunks(items, 3, async (n) => n * 10);
    expect(results.map((r) => (r.status === "fulfilled" ? r.value : null))).toEqual([
      10, 20, 30, 40, 50, 60, 70,
    ]);
  });

  it("never runs more than `concurrency` at once within a chunk", async () => {
    const items = Array.from({ length: 9 }, (_, i) => i);
    let inFlight = 0;
    let maxInFlight = 0;
    await processInChunks(items, 3, async (n) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return n;
    });
    expect(maxInFlight).toBeLessThanOrEqual(3);
  });

  it("captures rejections as 'rejected' without stopping later chunks", async () => {
    const items = [1, 2, 3, 4];
    const results = await processInChunks(items, 2, async (n) => {
      if (n === 2) throw new Error("boom");
      return n;
    });
    expect(results[1].status).toBe("rejected");
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
  });

  it("calls onChunk once per chunk, in order, with that chunk's results", async () => {
    const seen: number[][] = [];
    await processInChunks([1, 2, 3, 4, 5], 2, async (n) => n, (results, chunk) => {
      seen.push(chunk);
      expect(results).toHaveLength(chunk.length);
    });
    expect(seen).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("lets onChunk persist progress incrementally (simulated crash after chunk 1)", async () => {
    const persisted: number[] = [];
    const onChunk = vi.fn(async (results: PromiseSettledResult<number>[]) => {
      for (const r of results) if (r.status === "fulfilled") persisted.push(r.value);
      if (persisted.length >= 2) throw new Error("simulated timeout mid-run");
    });
    await expect(processInChunks([1, 2, 3, 4], 2, async (n) => n, onChunk)).rejects.toThrow(
      "simulated timeout mid-run",
    );
    // the first chunk's work made it out before the "timeout" — nothing from chunk 2 was lost silently
    expect(persisted).toEqual([1, 2]);
  });
});
