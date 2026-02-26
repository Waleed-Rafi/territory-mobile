/**
 * Supabase database types – aligned with territory-runner schema.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      activities: {
        Row: ActivityRow;
        Insert: ActivityInsert;
        Update: Partial<ActivityInsert>;
      };
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: Partial<ProfileInsert>;
      };
      runs: {
        Row: RunRow;
        Insert: RunInsert;
        Update: Partial<RunInsert>;
      };
      territories: {
        Row: TerritoryRow;
        Insert: TerritoryInsert;
        Update: Partial<TerritoryInsert>;
      };
    };
  };
}

/** Activity table – row and insert */
export interface ActivityRow {
  id: string;
  created_at: string;
  description: string | null;
  is_urgent: boolean;
  run_id: string | null;
  target_user_id: string | null;
  territory_id: string | null;
  title: string;
  type: string;
  user_id: string;
}

export interface ActivityInsert {
  id?: string;
  created_at?: string;
  description?: string | null;
  is_urgent?: boolean;
  run_id?: string | null;
  target_user_id?: string | null;
  territory_id?: string | null;
  title: string;
  type: string;
  user_id: string;
}

/** Profile table – row and insert (subset we use) */
export interface ProfileRow {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  city: string | null;
  total_distance: number;
  total_runs: number;
  territories_owned: number;
  territories_defended: number;
  level: number;
  created_at: string;
  updated_at: string;
  avatar_url: string | null;
  bio: string | null;
}

export interface ProfileInsert {
  user_id: string;
  username?: string | null;
  display_name?: string | null;
  city?: string | null;
  total_distance?: number;
  total_runs?: number;
  territories_owned?: number;
  territories_defended?: number;
  level?: number;
  avatar_url?: string | null;
  bio?: string | null;
}

/** Run table – row and insert */
export interface RunRow {
  id: string;
  user_id: string;
  distance: number;
  duration: number;
  avg_pace: number | null;
  started_at: string;
  finished_at: string | null;
  territory_claimed: boolean;
  is_valid: boolean;
  gps_points: Json;
  route_polyline: Json | null;
  created_at: string;
}

export interface RunInsert {
  user_id: string;
  distance?: number;
  duration?: number;
  avg_pace?: number | null;
  started_at?: string;
  finished_at?: string | null;
  territory_claimed?: boolean;
  is_valid?: boolean;
  gps_points?: Json;
  route_polyline?: Json | null;
}

/** Territory table – row and insert */
export interface TerritoryRow {
  id: string;
  owner_id: string;
  polygon: Json;
  strength: number;
  center_lat: number;
  center_lng: number;
  area_sqm: number;
  created_at: string;
  updated_at: string;
  last_defended_at: string;
  created_from_run_id: string | null;
  name: string | null;
}

export interface TerritoryInsert {
  owner_id: string;
  polygon: Json;
  strength?: number;
  center_lat: number;
  center_lng: number;
  area_sqm: number;
  created_from_run_id?: string | null;
}
