/**
 * Offline run queue: save runs locally when offline, sync to Supabase when online.
 * One-way sync (client → server). Uses AsyncStorage for durability.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RunInsert, TerritoryInsert, ActivityInsert } from "../types/database";
import { ActivityType } from "../types/domain";

const STORAGE_KEY = "territory_pending_runs";

/** Territory payload without created_from_run_id (added at sync time). */
export interface PendingTerritory {
  owner_id: string;
  polygon: [number, number][];
  center_lat: number;
  center_lng: number;
  area_sqm: number;
  strength?: number;
}

export interface PendingRun {
  id: string;
  run: RunInsert;
  territories: PendingTerritory[];
  activityType: "run_completed" | "territory_claimed";
  suggestedTitle: string;
  suggestedDescription: string;
}

async function getQueue(): Promise<PendingRun[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function setQueue(queue: PendingRun[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

/** Add a run to the pending queue (call when offline). */
export async function addPendingRun(payload: PendingRun): Promise<void> {
  const queue = await getQueue();
  queue.push(payload);
  await setQueue(queue);
}

/** Get all pending runs (for UI or sync). */
export async function getPendingRuns(): Promise<PendingRun[]> {
  return getQueue();
}

/** Remove one item by id after successful sync. */
async function removePendingRunById(id: string): Promise<void> {
  const queue = await getQueue();
  const next = queue.filter((r) => r.id !== id);
  await setQueue(next);
}

/** Count of pending runs. */
export async function getPendingCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

/**
 * Process the queue: for each pending run, insert run → update profile → territories → run.territory_claimed → activity.
 * Call when online. Stops on first failure so we can retry later.
 */
export async function processPendingRuns(
  supabase: SupabaseClient,
  userId: string
): Promise<{ synced: number; failed: string | null }> {
  const queue = await getQueue();
  if (queue.length === 0) return { synced: 0, failed: null };

  let synced = 0;
  for (const item of queue) {
    try {
      const { data: run, error: runError } = await supabase
        .from("runs")
        .insert(item.run)
        .select()
        .single();
      if (runError || !run) {
        return { synced, failed: (runError as Error)?.message ?? "Insert run failed" };
      }
      const runId = (run as { id: string }).id;

      const profileRes = await supabase
        .from("profiles")
        .select("total_distance, total_runs, territories_owned")
        .eq("user_id", userId)
        .single();
      const currentProfile = profileRes.data as { total_distance?: number; total_runs?: number; territories_owned?: number } | null;
      if (currentProfile) {
        const total_distance = (currentProfile.total_distance ?? 0) + Number(item.run.distance ?? 0);
        const total_runs = (currentProfile.total_runs ?? 0) + 1;
        const territoryCount = item.territories.length;
        const territories_owned = (currentProfile.territories_owned ?? 0) + territoryCount;
        await supabase.from("profiles").update({ total_distance, total_runs, territories_owned }).eq("user_id", userId);
      }

      for (const t of item.territories) {
        const territoryData: TerritoryInsert = {
          ...t,
          created_from_run_id: runId,
        };
        const { error: terrError } = await supabase.from("territories").insert(territoryData);
        if (terrError) return { synced, failed: (terrError as Error).message };
      }

      if (item.territories.length > 0) {
        await supabase.from("runs").update({ territory_claimed: true }).eq("id", runId);
      }

      const activityData: ActivityInsert = {
        user_id: userId,
        type: item.activityType === "territory_claimed" ? ActivityType.TerritoryClaimed : ActivityType.RunCompleted,
        title: item.suggestedTitle,
        description: item.suggestedDescription,
        run_id: runId,
      };
      const { error: activityError } = await supabase.from("activities").insert(activityData);
      if (activityError) return { synced, failed: (activityError as Error).message };

      await removePendingRunById(item.id);
      synced++;
    } catch (e) {
      return { synced, failed: e instanceof Error ? e.message : "Sync failed" };
    }
  }
  return { synced, failed: null };
}
