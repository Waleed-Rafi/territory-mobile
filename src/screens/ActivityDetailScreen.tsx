import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, useWindowDimensions, TouchableOpacity } from "react-native";
import MapView, { Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import { Share2 } from "lucide-react-native";
import { GlassCard } from "../components/GlassCard";
import { darkMapStyle } from "../theme/mapStyle";
import { useRoute, RouteProp } from "@react-navigation/native";
import { colors, radius, spacing, typography } from "../theme";
import { polylineToMapRegion, MAP_FIT_TIGHT, formatDistance, formatDuration, formatPace, formatElevation } from "../lib/gps";
import { RunPhotoThumbnail } from "../components/RunPhotoThumbnail";
import { ProfileStackHeader } from "../components/ProfileStackHeader";
import { ShareActivityModal } from "../components/ShareActivityModal";
import { getActivityIcon, getActivityColor } from "../constants/activity";
import { timeAgo } from "../utils/format";
import { strings } from "../l10n/strings";
import type { RootStackParamList } from "../types/navigation";
import type { ActivityDisplay } from "../types/domain";

type ActivityDetailRouteProp = RouteProp<RootStackParamList, "ActivityDetail">;

const DETAIL_MAP_HEIGHT = 280;

export default function ActivityDetailScreen(): React.ReactElement {
  const { width } = useWindowDimensions();
  const route = useRoute<ActivityDetailRouteProp>();
  const { activity } = route.params;
  const run = activity.run;
  const routeCoords =
    run?.route_polyline?.length &&
    run.route_polyline.map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
  const mapAspect = (width - 2 * spacing.lg) / DETAIL_MAP_HEIGHT;
  const mapRegion = run?.route_polyline?.length ? polylineToMapRegion(run.route_polyline, MAP_FIT_TIGHT, mapAspect) : null;

  /** Pace in m/s: from avg_pace (min/km) or distance/duration */
  const paceMps =
    run != null && run.duration > 0
      ? run.avg_pace != null
        ? 1000 / (run.avg_pace * 60)
        : run.distance / run.duration
      : 0;

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
            {mapRegion && routeCoords && routeCoords.length > 0 ? (
              <GlassCard style={styles.section}>
                <Text style={styles.sectionLabel}>Route</Text>
                <View style={styles.mapWrap}>
                  <MapView
                    style={styles.detailMap}
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
                    <Polyline coordinates={routeCoords} strokeColor={colors.primary} strokeWidth={5} lineCap="round" lineJoin="round" />
                  </MapView>
                </View>
              </GlassCard>
            ) : null}
          </>
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
  runName: { fontSize: 16, fontWeight: "600", color: colors.foreground },
  runDesc: { fontSize: 14, color: colors.mutedForeground, marginTop: 4, lineHeight: 20 },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  /* Fixed height for all runs; only the region (zoom) inside adapts to the route. */
  mapWrap: { height: DETAIL_MAP_HEIGHT, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.secondary },
  detailMap: { ...StyleSheet.absoluteFillObject, borderRadius: radius.md },
});
