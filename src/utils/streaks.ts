/**
 * Streak and period stats from run dates.
 * Run dates are ISO date strings (YYYY-MM-DD) or full ISO datetime.
 */

function toDateKey(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

/** Unique calendar dates that have at least one run, sorted descending (newest first). */
export function getRunDates(runStartedAts: string[]): string[] {
  const set = new Set<string>();
  runStartedAts.forEach((startedAt) => set.add(toDateKey(startedAt)));
  return Array.from(set).sort().reverse();
}

/** Current streak: consecutive days with a run ending today or yesterday. */
export function getCurrentStreak(runDates: string[]): number {
  if (runDates.length === 0) return 0;
  const today = toDateKey(new Date().toISOString());
  const yesterday = toDateKey(new Date(Date.now() - 864e5).toISOString());
  const set = new Set(runDates);
  if (!set.has(today) && !set.has(yesterday)) return 0;
  let count = 0;
  let d = new Date();
  const oneDay = 864e5;
  while (true) {
    const key = toDateKey(d.toISOString());
    if (set.has(key)) {
      count++;
      d = new Date(d.getTime() - oneDay);
    } else {
      break;
    }
  }
  return count;
}

/** Longest streak ever (consecutive days with a run). */
export function getLongestStreak(runDates: string[]): number {
  if (runDates.length === 0) return 0;
  const sorted = [...runDates].sort();
  let max = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]).getTime();
    const curr = new Date(sorted[i]).getTime();
    const diffDays = (curr - prev) / 864e5;
    if (diffDays === 1) {
      current++;
      max = Math.max(max, current);
    } else {
      current = 1;
    }
  }
  return max;
}

/** Start of current week (Monday) and month in local time, as ISO date keys. */
export function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return toDateKey(d.toISOString());
}

export function getMonthStart(date: Date): string {
  const d = new Date(date);
  d.setDate(1);
  return toDateKey(d.toISOString());
}

/** Sum distance and count runs for dates >= startDateKey (inclusive). */
export function statsInPeriod(
  runs: { started_at: string; distance: number }[],
  startDateKey: string
): { distanceKm: number; runCount: number } {
  let distanceKm = 0;
  let runCount = 0;
  const start = new Date(startDateKey).getTime();
  runs.forEach((r) => {
    const key = toDateKey(r.started_at);
    if (new Date(key).getTime() >= start) {
      distanceKm += r.distance / 1000;
      runCount++;
    }
  });
  return { distanceKm, runCount };
}
