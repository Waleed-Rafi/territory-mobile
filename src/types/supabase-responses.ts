/**
 * Typed Supabase select results and parsers.
 * Use these instead of blind `as` casts so invalid API shapes are caught.
 */

import type { ProfileDisplay } from "./domain";
import type { RunSummary } from "./domain";
import type { ActivityDisplay } from "./domain";

/** Profile select: username, display_name, city, total_distance, total_runs, territories_owned, territories_defended, level */
export interface ProfileSelectResult {
  username: string | null;
  display_name: string | null;
  city: string | null;
  total_distance: number;
  total_runs: number;
  territories_owned: number;
  territories_defended: number;
  level: number;
}

/** Runs list for stats: started_at, distance */
export interface RunStatsRow {
  started_at: string;
  distance: number;
}

/** Profile select for Level screen (no territories_defended) */
export interface ProfileLevelSelectResult {
  username: string | null;
  display_name: string | null;
  city: string | null;
  total_distance: number;
  total_runs: number;
  territories_owned: number;
  level: number;
}

export function parseProfileSelect(data: unknown): ProfileDisplay | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  return {
    username: (o.username as string | null) ?? null,
    display_name: (o.display_name as string | null) ?? null,
    city: (o.city as string | null) ?? null,
    total_distance: Number(o.total_distance) || 0,
    total_runs: Number(o.total_runs) || 0,
    territories_owned: Number(o.territories_owned) || 0,
    territories_defended: Number(o.territories_defended) ?? 0,
    level: Number(o.level) || 1,
  };
}

export function parseProfileLevelSelect(data: unknown): ProfileDisplay | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  return {
    username: (o.username as string | null) ?? null,
    display_name: (o.display_name as string | null) ?? null,
    city: (o.city as string | null) ?? null,
    total_distance: Number(o.total_distance) || 0,
    total_runs: Number(o.total_runs) || 0,
    territories_owned: Number(o.territories_owned) || 0,
    territories_defended: 0,
    level: Number(o.level) || 1,
  };
}

export function parseRunStatsRows(data: unknown): RunStatsRow[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((r) => r && typeof r === "object" && typeof (r as Record<string, unknown>).started_at === "string")
    .map((r) => {
      const o = r as Record<string, unknown>;
      return {
        started_at: o.started_at as string,
        distance: Number(o.distance) || 0,
      };
    });
}

function parseRunSummary(r: unknown): RunSummary | null {
  if (!r || typeof r !== "object") return null;
  const o = r as Record<string, unknown>;
  const photoUrls = o.photo_urls as string[] | unknown;
  const arr = Array.isArray(photoUrls) ? photoUrls : [];
  const poly = o.route_polyline as [number, number][] | unknown;
  const routePolyline = Array.isArray(poly) ? poly : null;
  const distance = Number(o.distance) || 0;
  const duration = Number(o.duration) || 0;
  const avgPace = o.avg_pace != null && typeof o.avg_pace === "number" ? o.avg_pace : null;
  const elevationGain = o.elevation_gain != null && typeof o.elevation_gain === "number" ? o.elevation_gain : null;
  return {
    name: (o.name as string | null) ?? null,
    description: (o.description as string | null) ?? null,
    photo_urls: arr.length ? arr : null,
    route_polyline: routePolyline,
    distance,
    duration,
    avg_pace: avgPace,
    elevation_gain: elevationGain,
    started_at: (o.started_at as string | null) ?? null,
  };
}

export function parseActivityRow(row: Record<string, unknown>): ActivityDisplay {
  const run = row.runs ? parseRunSummary(row.runs) : null;
  const { runs: _, ...rest } = row;
  return {
    id: String(rest.id ?? ""),
    type: String(rest.type ?? "run_completed"),
    title: String(rest.title ?? ""),
    description: (rest.description as string | null) ?? null,
    is_urgent: Boolean(rest.is_urgent),
    created_at: String(rest.created_at ?? new Date().toISOString()),
    run_id: (rest.run_id as string | null) ?? null,
    run,
  };
}

export function parseActivityList(data: unknown): ActivityDisplay[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((r) => r && typeof r === "object")
    .map((r) => parseActivityRow(r as Record<string, unknown>));
}
