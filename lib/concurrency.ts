/**
 * Runs `fn` over `items` in fixed-size sequential chunks, `concurrency` items at a time
 * within each chunk. `onChunk` fires after every chunk settles — callers use it to persist
 * progress incrementally, so a timeout mid-run only loses the chunk in flight, not
 * everything done so far.
 */
export async function processInChunks<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
  onChunk?: (results: PromiseSettledResult<R>[], chunk: T[]) => Promise<void> | void,
): Promise<PromiseSettledResult<R>[]> {
  const all: PromiseSettledResult<R>[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const results = await Promise.allSettled(chunk.map((item) => fn(item)));
    all.push(...results);
    if (onChunk) await onChunk(results, chunk);
  }
  return all;
}
