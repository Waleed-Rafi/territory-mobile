/**
 * Offline sync: detect network, process pending runs when online, expose isOnline and pending count.
 */

import { useEffect, useState, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabase/client";
import { processPendingRuns, getPendingCount } from "../utils/offlineQueue";

export function useOfflineSync(): {
  isOnline: boolean;
  pendingCount: number;
  syncNow: () => Promise<void>;
} {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const syncNow = useCallback(async () => {
    if (!user) return;
    await processPendingRuns(supabase, user.id);
    const count = await getPendingCount();
    setPendingCount(count);
  }, [user]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = state.isConnected === true && state.isInternetReachable !== false;
      setIsOnline(connected);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    getPendingCount().then(setPendingCount);
  }, []);

  useEffect(() => {
    if (!user || !isOnline) return;
    syncNow();
  }, [user, isOnline]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "active" && user && isOnline) void syncNow();
    });
    return () => sub.remove();
  }, [user, isOnline, syncNow]);

  return { isOnline, pendingCount, syncNow };
}
