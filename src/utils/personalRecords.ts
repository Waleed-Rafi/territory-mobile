/**
 * Personal records (best efforts) from run data.
 * Uses runs where distance >= target; best = minimum duration.
 */

export interface RunForPr {
  distance: number;
  duration: number;
  started_at: string;
}

export const STANDARD_DISTANCES = [
  { key: "1k", label: "1 km", meters: 1000 },
  { key: "5k", label: "5 km", meters: 5000 },
  { key: "10k", label: "10 km", meters: 10000 },
  { key: "half", label: "Half marathon", meters: 21097.5 },
  { key: "marathon", label: "Marathon", meters: 42195 },
] as const;

export type DistanceKey = (typeof STANDARD_DISTANCES)[number]["key"];

export interface BestEffort {
  distanceKey: DistanceKey;
  label: string;
  meters: number;
  durationSeconds: number;
  startedAt: string;
}

/** Compute best effort for a distance: best run that covered at least that distance (min duration). */
function bestForDistance(
  runs: RunForPr[],
  meters: number
): { durationSeconds: number; startedAt: string } | null {
  const eligible = runs.filter((r) => r.distance >= meters);
  if (eligible.length === 0) return null;
  const best = eligible.reduce((a, b) => (a.duration < b.duration ? a : b));
  return { durationSeconds: best.duration, startedAt: best.started_at };
}

/** Compute all best efforts from runs. */
export function computeBestEfforts(runs: RunForPr[]): BestEffort[] {
  const result: BestEffort[] = [];
  for (const d of STANDARD_DISTANCES) {
    const pr = bestForDistance(runs, d.meters);
    if (pr)
      result.push({
        distanceKey: d.key,
        label: d.label,
        meters: d.meters,
        durationSeconds: pr.durationSeconds,
        startedAt: pr.startedAt,
      });
  }
  return result;
}
