import React, { useState, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, TouchableOpacity, ActivityIndicator } from "react-native";
import { Share2, TrendingUp, Zap } from "lucide-react-native";
import { GlassCard } from "../components/GlassCard";
import { MapboxRouteMap } from "../components/MapboxRouteMap";
import { useRoute, RouteProp } from "@react-navigation/native";
import { colors, radius, spacing, typography } from "../theme";
import { polylineToMapRegion, MAP_FIT_TIGHT, formatDistance, formatDuration, formatPace, formatElevation } from "../lib/gps";
import {
  parseGpsPoints,
  computeSplits,
  computeSplitsFromPolyline,
  computePaceProfile,
  computePaceProfileFromPolyline,
  computeElevationProfile,
} from "../lib/runAnalytics";
import { LineChart } from "../components/charts/LineChart";
import { ElevationChart } from "../components/charts/ElevationChart";
import { RunPhotoThumbnail } from "../components/RunPhotoThumbnail";
import { ProfileStackHeader } from "../components/ProfileStackHeader";
import { ShareActivityModal } from "../components/ShareActivityModal";
import { getActivityIcon, getActivityColor } from "../constants/activity";
import { timeAgo } from "../utils/format";
import { supabase } from "../supabase/client";
import { strings } from "../l10n/strings";
import type { RootStackParamList } from "../types/navigation";
import type { ActivityDisplay } from "../types/domain";

type ActivityDetailRouteProp = RouteProp<RootStackParamList, "ActivityDetail">;

const DETAIL_MAP_HEIGHT = 280;
const CHART_HEIGHT = 140;

interface FullRun {
  gps_points: unknown;
}

export default function ActivityDetailScreen(): React.ReactElement {
  const { width } = useWindowDimensions();
  const route = useRoute<ActivityDetailRouteProp>();
  const { activity } = route.params;
  const run = activity.run;
  const [fullRun, setFullRun] = useState<FullRun | null>(null);
  const [loadingRun, setLoadingRun] = useState(!!activity.run_id);

  const routePolyline = run?.route_polyline ?? [];
  const mapAspect = (width - 2 * spacing.lg) / DETAIL_MAP_HEIGHT;
  const mapRegion = run?.route_polyline?.length ? polylineToMapRegion(run.route_polyline, MAP_FIT_TIGHT, mapAspect) : null;

  const totalDistance = run?.distance ?? 0;
  const totalDuration = run?.duration ?? 0;
  const paceMps =
    run != null && run.duration > 0
      ? run.avg_pace != null
        ? 1000 / (run.avg_pace * 60)
        : run.distance / run.duration
      : 0;

  useEffect(() => {
    if (!activity.run_id) {
      setLoadingRun(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("runs")
          .select("gps_points")
          .eq("id", activity.run_id)
          .single();
        if (!cancelled && !error && data) setFullRun(data as FullRun);
      } finally {
        if (!cancelled) setLoadingRun(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activity.run_id]);

  const gpsPoints = useMemo(() => {
    if (!fullRun?.gps_points) return [];
    return parseGpsPoints(fullRun.gps_points);
  }, [fullRun?.gps_points]);

  const hasGpsData = gpsPoints.length >= 5;

  const { splits, fastestSplitIndex } = useMemo(() => {
    if (totalDistance < 100 || totalDuration <= 0) return { splits: [], fastestSplitIndex: -1 };
    if (hasGpsData) return computeSplits(gpsPoints, totalDistance, totalDuration, 1000);
    if (run?.route_polyline?.length) return computeSplitsFromPolyline(run.route_polyline, totalDistance, totalDuration, 1000);
    return { splits: [], fastestSplitIndex: -1 };
  }, [gpsPoints, hasGpsData, run?.route_polyline, totalDistance, totalDuration]);

  const paceProfile = useMemo(() => {
    if (totalDistance < 200 || totalDuration <= 0) return [];
    if (hasGpsData) return computePaceProfile(gpsPoints, totalDistance, totalDuration, 150, 50);
    if (run?.route_polyline?.length) return computePaceProfileFromPolyline(run.route_polyline, totalDistance, totalDuration, 50);
    return [];
  }, [gpsPoints, hasGpsData, run?.route_polyline, totalDistance, totalDuration]);

  const elevationProfile = useMemo(() => {
    if (!hasGpsData) return [];
    return computeElevationProfile(gpsPoints);
  }, [gpsPoints, hasGpsData]);

  const paceChartData = paceProfile.map((p) => ({
    x: p.distance,
    y: p.paceMps > 0 ? 1000 / p.paceMps / 60 : 10,
  }));

  const fastestSplit = fastestSplitIndex >= 0 ? splits[fastestSplitIndex] : null;

  const Icon = getActivityIcon(activity.type);
  const color = getActivityColor(activity.type);
  const [shareModalVisible, setShareModalVisible] = useState(false);

  return (
    <View style={styles.container}>
      <ProfileStackHeader
        title="Activity"
        rightElement={
          <TouchableOpacity
            onPress={() => setShareModalVisible(true)}
            style={styles.shareButton}
            accessibilityRole="button"
            accessibilityLabel={strings.activity.shareA11y}
          >
            <Share2 size={22} color={colors.foreground} />
          </TouchableOpacity>
        }
      />
      <ShareActivityModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        activity={activity}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard style={[styles.card, activity.is_urgent && styles.cardUrgent]}>
          <View style={styles.headerRow}>
            <View style={styles.iconWrap}>
              <Icon size={24} color={color} />
            </View>
            <View style={styles.titleWrap}>
              <Text style={styles.title}>{activity.title}</Text>
              <Text style={styles.time}>{timeAgo(activity.created_at)}</Text>
            </View>
          </View>
          {activity.description ? (
            <Text style={styles.description}>{activity.description}</Text>
          ) : null}
        </GlassCard>

        {run ? (
          <>
            {(run.distance > 0 || run.duration > 0) ? (
              <GlassCard style={styles.section}>
                <Text style={styles.sectionLabel}>Run stats</Text>
                <View style={styles.statsRow}>
                  {run.distance > 0 ? (
                    <View style={styles.stat}>
                      <Text style={styles.statValue}>{formatDistance(run.distance)}</Text>
                      <Text style={styles.statLabel}>Distance</Text>
                    </View>
                  ) : null}
                  {run.duration > 0 ? (
                    <View style={styles.stat}>
                      <Text style={styles.statValue}>{formatDuration(run.duration)}</Text>
                      <Text style={styles.statLabel}>Duration</Text>
                    </View>
                  ) : null}
                  {paceMps > 0 ? (
                    <View style={styles.stat}>
                      <Text style={styles.statValue}>{formatPace(paceMps)}<Text style={styles.statUnit}>/km</Text></Text>
                      <Text style={styles.statLabel}>Avg Pace</Text>
                    </View>
                  ) : null}
                  {run.elevation_gain != null && run.elevation_gain > 0 ? (
                    <View style={styles.stat}>
                      <Text style={styles.statValue}>{formatElevation(run.elevation_gain)}</Text>
                      <Text style={styles.statLabel}>Elevation</Text>
                    </View>
                  ) : null}
                </View>
              </GlassCard>
            ) : null}

            {fastestSplit && splits.length > 1 ? (
              <GlassCard style={styles.section}>
                <View style={styles.fastestRow}>
                  <Zap size={16} color={colors.primary} />
                  <Text style={styles.sectionLabel}>{strings.activity.fastestSplit}</Text>
                </View>
                <View style={styles.fastestCard}>
                  <Text style={styles.fastestValue}>
                    {formatPace(fastestSplit.paceMps)}
                    <Text style={styles.statUnit}>/km</Text>
                  </Text>
                  <Text style={styles.fastestLabel}>
                    {fastestSplit.segmentDistance >= 1000
                      ? `km ${fastestSplit.index}`
                      : `${(fastestSplit.distanceStart / 1000).toFixed(2)}–${(fastestSplit.distanceEnd / 1000).toFixed(2)} km`}
                  </Text>
                </View>
              </GlassCard>
            ) : null}

            {splits.length > 0 ? (
              <GlassCard style={styles.section}>
                <Text style={styles.sectionLabel}>{strings.activity.splits}</Text>
                <View style={styles.splitsTable}>
                  <View style={styles.splitsHeader}>
                    <Text style={styles.splitsHeaderCell}>#</Text>
                    <Text style={styles.splitsHeaderCell}>Distance</Text>
                    <Text style={styles.splitsHeaderCell}>Pace</Text>
                  </View>
                  {splits.map((s) => (
                    <View
                      key={s.index}
                      style={[styles.splitsRow, s.index === fastestSplitIndex + 1 && styles.splitsRowHighlight]}
                    >
                      <Text style={styles.splitsCell}>{s.index}</Text>
                      <Text style={styles.splitsCell}>
                        {s.segmentDistance >= 1000
                          ? `${s.index} km`
                          : `${(s.segmentDistance / 1000).toFixed(2)} km`}
                      </Text>
                      <Text style={styles.splitsCell}>{formatPace(s.paceMps)}</Text>
                    </View>
                  ))}
                </View>
              </GlassCard>
            ) : null}

            {paceChartData.length >= 2 ? (
              <GlassCard style={styles.section}>
                <View style={styles.chartHeader}>
                  <TrendingUp size={14} color={colors.mutedForeground} />
                  <Text style={styles.sectionLabel}>{strings.activity.paceChart}</Text>
                </View>
                <LineChart
                  data={paceChartData}
                  width={width - 2 * spacing.lg - 2 * spacing.lg}
                  height={CHART_HEIGHT}
                  strokeColor={colors.primary}
                  fillGradient={true}
                />
              </GlassCard>
            ) : null}

            {elevationProfile.length >= 2 ? (
              <GlassCard style={styles.section}>
                <Text style={styles.sectionLabel}>{strings.activity.elevationChart}</Text>
                <ElevationChart
                  data={elevationProfile}
                  width={width - 2 * spacing.lg - 2 * spacing.lg}
                  height={CHART_HEIGHT}
                />
              </GlassCard>
            ) : null}

            {(run.name || run.description) ? (
              <GlassCard style={styles.section}>
                {run.name ? <Text style={styles.runName}>{run.name}</Text> : null}
                {run.description ? <Text style={styles.runDesc}>{run.description}</Text> : null}
              </GlassCard>
            ) : null}

            {run.photo_urls && run.photo_urls.length > 0 ? (
              <GlassCard style={styles.section}>
                <Text style={styles.sectionLabel}>Photos</Text>
                <View style={styles.photoRow}>
                  {run.photo_urls.map((path, i) => (
                    <RunPhotoThumbnail key={i} path={path} size={100} />
                  ))}
                </View>
              </GlassCard>
            ) : null}

            {mapRegion && routePolyline.length > 0 ? (
              <GlassCard style={styles.section}>
                <Text style={styles.sectionLabel}>Route</Text>
                <View style={styles.mapWrap}>
                  <MapboxRouteMap
                    polyline={routePolyline}
                    mapRegion={mapRegion}
                    strokeWidth={5}
                    style={styles.detailMap}
                    scrollEnabled={false}
                    zoomEnabled={false}
                  />
                </View>
              </GlassCard>
            ) : null}
          </>
        ) : loadingRun ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.loadingText}>{strings.common.loading}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: 48 },
  shareButton: { padding: spacing.sm },
  card: {
    overflow: "hidden",
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  cardUrgent: { borderLeftWidth: 4, borderLeftColor: colors.enemy },
  headerRow: { flexDirection: "row", alignItems: "flex-start" },
  iconWrap: { marginRight: spacing.md },
  titleWrap: { flex: 1, minWidth: 0 },
  title: { fontSize: 20, fontWeight: "700", color: colors.foreground, fontFamily: typography.display },
  time: { fontSize: 13, color: colors.mutedForeground, marginTop: 4 },
  description: { fontSize: 14, color: colors.mutedForeground, marginTop: spacing.md, lineHeight: 22 },
  section: {
    overflow: "hidden",
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.mutedForeground,
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xl },
  stat: { minWidth: 72 },
  statValue: { fontSize: 18, fontWeight: "700", color: colors.foreground, fontFamily: typography.display },
  statUnit: { fontSize: 14, fontWeight: "600", color: colors.mutedForeground },
  statLabel: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  fastestRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.sm },
  fastestCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  fastestValue: { fontSize: 24, fontWeight: "700", color: colors.primary, fontFamily: typography.display },
  fastestLabel: { fontSize: 12, color: colors.mutedForeground, marginTop: 4 },
  splitsTable: { gap: 0 },
  splitsHeader: {
    flexDirection: "row",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  splitsHeaderCell: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
    color: colors.mutedForeground,
  },
  splitsRow: {
    flexDirection: "row",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  splitsRowHighlight: { backgroundColor: "rgba(0, 255, 136, 0.08)" },
  splitsCell: { flex: 1, fontSize: 13, color: colors.foreground },
  chartHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.sm },
  runName: { fontSize: 16, fontWeight: "600", color: colors.foreground },
  runDesc: { fontSize: 14, color: colors.mutedForeground, marginTop: 4, lineHeight: 20 },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  mapWrap: { height: DETAIL_MAP_HEIGHT, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.secondary },
  detailMap: { ...StyleSheet.absoluteFillObject, borderRadius: radius.md },
  loadingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.xl },
  loadingText: { fontSize: 14, color: colors.mutedForeground },
});
