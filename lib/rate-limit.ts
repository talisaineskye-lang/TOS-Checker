const hits = new Map<string, number[]>();

export function rateLimit(
  identifier: string,
  { limit = 10, windowMs = 60_000 } = {}
): { success: boolean; remaining: number } {
  const now = Date.now();
  const timestamps = hits.get(identifier) ?? [];

  // Remove expired entries
  const valid = timestamps.filter((t) => now - t < windowMs);

  if (valid.length >= limit) {
    hits.set(identifier, valid);
    return { success: false, remaining: 0 };
  }

  valid.push(now);
  hits.set(identifier, valid);
  return { success: true, remaining: limit - valid.length };
}
