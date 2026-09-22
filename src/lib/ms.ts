const UNIT_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

// Parses simple durations like "15m", "30d", "500ms" into milliseconds.
// Deliberately minimal - only what JWT_*_TTL env values need.
export default function ms(duration: string): number {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(duration.trim());
  if (!match) {
    throw new Error(`Invalid duration string: "${duration}"`);
  }
  const [, amount, unit] = match as unknown as [string, string, string];
  return Number(amount) * UNIT_MS[unit]!;
}
