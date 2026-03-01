/**
 * Run history – list of the user's runs (run_completed activities). Tap to open detail.
 */

import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../contexts/AuthContext";
import { useAlert } from "../contexts/AlertContext";
import { supabase } from "../supabase/client";
import { GlassCard } from "../components/GlassCard";
import { ProfileStackHeader } from "../components/ProfileStackHeader";
import { colors, radius, spacing, typography } from "../theme";
import type { ActivityDisplay } from "../types/domain";
import { parseActivityList } from "../types/supabase-responses";
import type { RootStackParamList } from "../types/navigation";
import { formatDistance, formatDuration, formatPace } from "../lib/gps";
import { strings } from "../l10n/strings";

const RUN_HISTORY_PAGE_SIZE = 50;

export default function RunHistoryScreen(): React.ReactElement {
  const { user } = useAuth();
  const alert = useAlert();
  const navigation = useNavigation();
  const rootNav = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const [activities, setActivities] = useState<ActivityDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRuns = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("activities")
      .select("id, type, title, description, is_urgent, created_at, run_id, runs(name, description, photo_urls, route_polyline, distance, duration, avg_pace, elevation_gain, started_at)")
      .eq("user_id", user.id)
      .eq("type", "run_completed")
      .order("created_at", { ascending: false })
      .limit(RUN_HISTORY_PAGE_SIZE);
    if (error) {
      alert.show(strings.common.error, error.message || strings.errors.loadActivity);
      setLoading(false);
      return;
    }
    setActivities(parseActivityList(data ?? undefined));
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

  const renderItem = ({ item }: { item: ActivityDisplay }) => {
    const run = item.run;
    const paceMps =
      run != null && run.duration > 0
        ? run.avg_pace != null
          ? 1000 / (run.avg_pace * 60)
          : run.distance / run.duration
        : 0;
    const dateLabel = (() => {
      try {
        return new Date(item.created_at).toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      } catch {
        return item.created_at.slice(0, 10);
      }
    })();

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => rootNav?.navigate("ActivityDetail", { activity: item })}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}, ${dateLabel}. Tap to view details.`}
      >
        <GlassCard style={styles.card}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.date}>{dateLabel}</Text>
          {run && (run.distance > 0 || run.duration > 0) && (
            <View style={styles.stats}>
              {run.distance > 0 && (
                <Text style={styles.stat}>{formatDistance(run.distance)}</Text>
              )}
              {run.distance > 0 && run.duration > 0 && <Text style={styles.statDot}> · </Text>}
              {run.duration > 0 && (
                <Text style={styles.stat}>{formatDuration(run.duration)}</Text>
              )}
              {paceMps > 0 && (
                <>
                  <Text style={styles.statDot}> · </Text>
                  <Text style={styles.stat}>{formatPace(paceMps)}/km</Text>
                </>
              )}
            </View>
          )}
        </GlassCard>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ProfileStackHeader title={strings.profile.runHistory} />
      <FlatList
        data={activities}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, activities.length === 0 && styles.listEmpty]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <GlassCard style={styles.empty}>
              <Text style={styles.emptyText}>{strings.profile.runHistoryEmpty}</Text>
            </GlassCard>
          ) : null
        }
      />
      {loading && activities.length === 0 && (
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>{strings.common.loading}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingBottom: 100 },
  listEmpty: { flexGrow: 1 },
  card: {
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.lg,
  },
  title: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  date: { fontSize: 13, color: colors.mutedForeground, marginTop: 4 },
  stats: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: 6 },
  stat: { fontSize: 14, fontWeight: "600", color: colors.primary, fontFamily: typography.mono },
  statDot: { fontSize: 14, color: colors.mutedForeground },
  empty: {
    padding: spacing["2xl"],
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radius.lg,
  },
  emptyText: { fontSize: 14, color: colors.mutedForeground, textAlign: "center" },
  loadingWrap: { position: "absolute", left: 0, right: 0, top: 120, alignItems: "center" },
  loadingText: { fontSize: 14, color: colors.mutedForeground },
});
