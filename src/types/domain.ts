/**
 * Domain types and enums used across the app.
 */

/** Activity type enum – matches Supabase activity.type */
export enum ActivityType {
  TerritoryClaimed = "territory_claimed",
  TerritoryAttacked = "territory_attacked",
  TerritoryDefended = "territory_defended",
  TerritoryLost = "territory_lost",
  TerritoryDecaying = "territory_decaying",
  RunCompleted = "run_completed",
}

/** Territory with polygon as coordinate array (for map rendering) */
export interface TerritoryMapItem {
  id: string;
  owner_id: string;
  polygon: [number, number][];
  strength: number;
  center_lat: number;
  center_lng: number;
  area_sqm: number;
  owner_username?: string;
}

/** Profile fields we display on Profile screen */
export interface ProfileDisplay {
  username: string | null;
  display_name: string | null;
  city: string | null;
  total_distance: number;
  total_runs: number;
  territories_owned: number;
  territories_defended: number;
  level: number;
}

/** Run fields we display in recent runs */
export interface RunDisplay {
  id: string;
  distance: number;
  duration: number;
  territory_claimed: boolean;
  started_at: string;
}

/** Activity fields we display in the feed */
export interface ActivityDisplay {
  id: string;
  type: string;
  title: string;
  description: string | null;
  is_urgent: boolean;
  created_at: string;
}
