import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform, useWindowDimensions } from "react-native";
import MapView, { Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import { Share2 } from "lucide-react-native";
import { GlassCard } from "../components/GlassCard";
import { darkMapStyle } from "../theme/mapStyle";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../contexts/AuthContext";
import { useAlert } from "../contexts/AlertContext";
import { supabase } from "../supabase/client";
import { Loader } from "../components/Loaders";
import { colors, radius, spacing, typography } from "../theme";
import type { ActivityDisplay } from "../types/domain";
import { parseActivityList } from "../types/supabase-responses";
import type { RootStackParamList } from "../types/navigation";
import { RunPhotoThumbnail } from "../components/RunPhotoThumbnail";
import { ShareActivityModal } from "../components/ShareActivityModal";
import { polylineToMapRegion, MAP_FIT_TIGHT, formatDistance, formatDuration, formatPace } from "../lib/gps";
import { getActivityIcon, getActivityColor } from "../constants/activity";
import { timeAgo } from "../utils/format";
import { strings } from "../l10n/strings";

const ACTIVITY_FEED_PAGE_SIZE = 30;

/** Normalize raw activity row from realtime (no runs join). */
function normalizeRealtimeActivity(row: Record<string, unknown>): ActivityDisplay {
  return {
    id: String(row.id ?? ""),
    type: String(row.type ?? "run_completed"),
    title: String(row.title ?? ""),
    description: (row.description as string | null) ?? null,
    is_urgent: Boolean(row.is_urgent),
    created_at: String(row.created_at ?? new Date().toISOString()),
    run_id: (row.run_id as string | null) ?? null,
    run: null,
  };
}

const CARD_MAP_HEIGHT = 140;

export default function ActivityScreen(): React.ReactElement {
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const alert = useAlert();
  const navigation = useNavigation();
  const rootNav = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const [activities, setActivities] = useState<ActivityDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shareActivity, setShareActivity] = useState<ActivityDisplay | null>(null);
  const mapAspect = (width - 2 * spacing.lg) / CARD_MAP_HEIGHT;

  const loadActivities = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("activities")
      .select("id, type, title, description, is_urgent, created_at, run_id, runs(name, description, photo_urls, route_polyline, distance, duration, avg_pace, started_at)")
      .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(ACTIVITY_FEED_PAGE_SIZE);
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
    void loadActivities();
    const channel = supabase
      .channel("activities-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activities" },
        (payload) => {
          const raw = payload.new as Record<string, unknown>;
          const newActivity = normalizeRealtimeActivity(raw);
          setActivities((prev) => [newActivity, ...prev]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadActivities]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadActivities();
    setRefreshing(false);
  }, [loadActivities]);

  const renderItem = ({ item }: { item: ActivityDisplay }): React.ReactElement => {
    const Icon = getActivityIcon(item.type);
    const color = getActivityColor(item.type);
    const run = item.run;
    const paceMps =
      run != null && run.duration > 0
        ? run.avg_pace != null
          ? 1000 / (run.avg_pace * 60)
          : run.distance / run.duration
        : 0;
    const hasRunStats = run && (run.distance > 0 || run.duration > 0);
    const routeCoords =
      run?.route_polyline?.length &&
      run.route_polyline.map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
    const mapRegion = run?.route_polyline?.length ? polylineToMapRegion(run.route_polyline, MAP_FIT_TIGHT, mapAspect) : null;

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.85}
        onPress={() => rootNav?.navigate("ActivityDetail", { activity: item })}
        accessibilityRole="button"
        accessibilityLabel={strings.activity.tapToViewDetails(item.title)}
      >
        <GlassCard
          style={[styles.card, item.is_urgent && styles.cardUrgent]}
        >
          <View style={styles.cardTop}>
            <View style={styles.cardIcon}>
              <Icon size={20} color={color} />
            </View>
            <View style={styles.cardMeta}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardTime}>{timeAgo(item.created_at)}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShareActivity(item)}
              style={styles.cardShareBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={strings.activity.shareA11y}
            >
              <Share2 size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          {hasRunStats && run ? (
            <View style={styles.statsRow}>
              {run.distance > 0 ? (
                <View style={styles.statBlock}>
                  <Text style={styles.statValue}>{formatDistance(run.distance)}</Text>
                  <Text style={styles.statLabel}>Distance</Text>
                </View>
              ) : null}
              {run.duration > 0 ? (
                <View style={styles.statBlock}>
                  <Text style={styles.statValue}>{formatDuration(run.duration)}</Text>
                  <Text style={styles.statLabel}>Duration</Text>
                </View>
              ) : null}
              {paceMps > 0 ? (
                <View style={styles.statBlock}>
                  <Text style={styles.statValue}>{formatPace(paceMps)}<Text style={styles.statUnit}>/km</Text></Text>
                  <Text style={styles.statLabel}>Pace</Text>
                </View>
              ) : null}
            </View>
          ) : null}
          {item.description ? (
            <Text style={styles.cardDesc}>{item.description}</Text>
          ) : null}
          {run?.photo_urls && run.photo_urls.length > 0 ? (
            <View style={styles.photoRow}>
              {run.photo_urls.slice(0, 4).map((path, i) => (
                <RunPhotoThumbnail key={i} path={path} size={56} />
              ))}
            </View>
          ) : null}
          {mapRegion && routeCoords && routeCoords.length > 0 ? (
            <View style={styles.mapSection}>
              <Text style={styles.mapLabel}>Route</Text>
              <View style={styles.mapWrap}>
                <MapView
                  style={styles.miniMap}
                  provider={PROVIDER_DEFAULT}
                  initialRegion={mapRegion}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                  pointerEvents="none"
                  userInterfaceStyle="dark"
                  mapType={Platform.OS === "android" ? "none" : "mutedStandard"}
                  {...(Platform.OS === "android" && { customMapStyle: darkMapStyle })}
                >
                  <Polyline coordinates={routeCoords} strokeColor={colors.primary} strokeWidth={3} />
                </MapView>
              </View>
            </View>
          ) : null}
        </GlassCard>
      </TouchableOpacity>
    );
  };

  const listEmpty = (
    loading ? (
      <View style={styles.placeholder}>
        <Loader type="skeleton" style={styles.skeletonWrap} />
        <Text style={styles.placeholderText}>{strings.common.loading}</Text>
      </View>
    ) : (
<GlassCard style={styles.empty}>
          <Text style={styles.emptyText}>{strings.activity.empty}</Text>
        </GlassCard>
    )
  );

  return (
    <View style={styles.container}>
      {shareActivity ? (
        <ShareActivityModal
          visible
          onClose={() => setShareActivity(null)}
          activity={shareActivity}
        />
      ) : null}
      <View style={styles.headerRow}>
        <Text style={styles.header}>{strings.activity.title}</Text>
        {activities.length > 0 ? (
          <Text style={styles.headerCount}>{activities.length}</Text>
        ) : null}
      </View>
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
            title={strings.common.refreshing}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.secondary}
          />
        }
        ListEmptyComponent={listEmpty}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingTop: 56 },
  headerRow: { flexDirection: "row", alignItems: "baseline", marginBottom: spacing.lg, gap: spacing.sm },
  header: {
    fontFamily: typography.display,
    fontSize: 22,
    fontWeight: "700",
    color: colors.foreground,
    letterSpacing: 2,
  },
  headerCount: {
    fontSize: 14,
    color: colors.mutedForeground,
    fontWeight: "600",
  },
  list: { paddingBottom: 100 },
  listEmpty: { flexGrow: 1 },
  card: {
    overflow: "hidden",
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  cardUrgent: { borderLeftWidth: 3, borderLeftColor: colors.enemy },
  cardTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.xs },
  cardIcon: { marginRight: spacing.md },
  cardMeta: { flex: 1, minWidth: 0 },
  cardShareBtn: { padding: spacing.xs },
  cardContent: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.foreground },
  cardDesc: { fontSize: 13, color: colors.mutedForeground, marginTop: spacing.sm, lineHeight: 20 },
  cardTime: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  statBlock: { minWidth: 64 },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.foreground,
    fontFamily: typography.display,
  },
  statUnit: { fontSize: 14, fontWeight: "600", color: colors.mutedForeground },
  statLabel: { fontSize: 11, color: colors.mutedForeground, marginTop: 2, letterSpacing: 0.5 },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  mapSection: { marginTop: spacing.md },
  mapLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.mutedForeground,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  /* Fixed height for all runs; only the region (zoom) inside adapts to the route. */
  mapWrap: { height: CARD_MAP_HEIGHT, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.secondary },
  miniMap: StyleSheet.absoluteFillObject,
  placeholder: { padding: spacing["2xl"], alignItems: "center" },
  skeletonWrap: { marginBottom: spacing.lg, width: "100%", maxWidth: 280 },
  placeholderText: { color: colors.mutedForeground },
  empty: {
    overflow: "hidden",
    borderRadius: radius.lg,
    padding: spacing["2xl"],
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  emptyText: { fontSize: 14, color: colors.mutedForeground, textAlign: "center" },
});
