export function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Weighted sample without replacement.
 *
 * Uses the exponential-sort trick: give each item the key `-ln(U)/w` and take
 * the `n` smallest. That yields a draw where the chance of being picked is
 * proportional to weight, in one pass and with no rejection loop — which
 * matters because the naive "pick, remove, renormalise" version is O(n²) and
 * the rejection version can spin badly when one weight dominates.
 *
 * Items with weight <= 0 are never selected.
 */
export function weightedSample<T>(
  items: T[],
  weightOf: (item: T) => number,
  n: number,
): T[] {
  return items
    .map((item) => {
      const w = weightOf(item);
      if (w <= 0) return { item, key: Infinity };
      // Math.random() can return exactly 0, and ln(0) is -Infinity; nudging it
      // off zero keeps the key finite.
      const u = Math.random() || Number.MIN_VALUE;
      return { item, key: -Math.log(u) / w };
    })
    .filter((entry) => entry.key !== Infinity)
    .sort((a, b) => a.key - b.key)
    .slice(0, n)
    .map((entry) => entry.item);
}
