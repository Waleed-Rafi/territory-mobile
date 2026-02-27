/**
 * Personal records (best efforts) at standard distances: 1k, 5k, 10k, half, marathon.
 */

import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { Trophy } from "lucide-react-native";
import { ProfileStackHeader } from "../components/ProfileStackHeader";
import { GlassCard } from "../components/GlassCard";
import { useAuth } from "../contexts/AuthContext";
import { useAlert } from "../contexts/AlertContext";
import { supabase } from "../supabase/client";
import { colors, radius, spacing, typography } from "../theme";
import { formatDuration } from "../lib/gps";
import { computeBestEfforts, type RunForPr } from "../utils/personalRecords";
import { strings } from "../l10n/strings";

const FIVE_YEARS_AGO = new Date(Date.now() - 5 * 365 * 864e5).toISOString();

export default function PersonalRecordsScreen(): React.ReactElement {
  const { user } = useAuth();
  const alert = useAlert();
  const [runs, setRuns] = useState<RunForPr[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRuns = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("runs")
      .select("distance, duration, started_at")
      .eq("user_id", user.id)
      .gte("started_at", FIVE_YEARS_AGO)
      .gte("distance", 1000);
    if (error) {
      alert.show(strings.common.error, error.message || "Failed to load runs.");
      setLoading(false);
      return;
    }
    const list = (data ?? []).map((r) => ({
      distance: Number(r.distance) || 0,
      duration: Number(r.duration) || 0,
      started_at: String(r.started_at ?? ""),
    }));
    setRuns(list);
    setLoading(false);
  }, [user, alert]);

  useEffect(() => {
    if (!user) return;
    void loadRuns();
  }, [user, loadRuns]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRuns();
    setRefreshing(false);
  }, [loadRuns]);

  const bestEfforts = computeBestEfforts(runs);
  const loadingState = loading && runs.length === 0;
  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  return (
    <View style={styles.container}>
      <ProfileStackHeader title={strings.profile.personalRecords} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {loadingState ? (
          <Text style={styles.hint}>{strings.common.loading}</Text>
        ) : bestEfforts.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Trophy size={32} stroke={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>{strings.profile.personalRecordsEmpty}</Text>
            <Text style={styles.emptySub}>{strings.profile.personalRecordsHint}</Text>
          </GlassCard>
        ) : (
          bestEfforts.map((pr) => (
            <GlassCard key={pr.distanceKey} style={styles.prCard}>
              <View style={styles.prRow}>
                <Text style={styles.prLabel}>{pr.label}</Text>
                <Text style={styles.prTime}>{formatDuration(pr.durationSeconds)}</Text>
              </View>
              <Text style={styles.prDate}>{formatDate(pr.startedAt)}</Text>
            </GlassCard>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 48 },
  hint: { fontSize: 14, color: colors.mutedForeground, textAlign: "center", marginTop: spacing.xl },
  emptyCard: {
    padding: spacing["2xl"],
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.lg,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground, marginTop: spacing.md },
  emptySub: { fontSize: 13, color: colors.mutedForeground, marginTop: spacing.xs, textAlign: "center" },
  prCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.lg,
  },
  prRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  prLabel: { fontSize: 15, fontWeight: "600", color: colors.foreground },
  prTime: { fontFamily: typography.display, fontSize: 18, fontWeight: "700", color: colors.primary },
  prDate: { fontSize: 12, color: colors.mutedForeground, marginTop: 4 },
});
