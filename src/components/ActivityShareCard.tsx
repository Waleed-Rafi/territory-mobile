/**
 * Activity share card – Strava-style card with route map + stats overlay.
 * Rendered at fixed 9:16 aspect for story/share. Capture this view to share or save.
 */

import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import MapView, { Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import { colors, spacing, typography } from "../theme";
import { darkMapStyle } from "../theme/mapStyle";
import { formatDistance, formatDuration, formatPace } from "../lib/gps";
import type { MapRegion } from "../lib/gps";
import type { ActivityDisplay } from "../types/domain";

/** Card size: 9:16 story aspect. Use these for layout; capture can scale up. */
export const SHARE_CARD_WIDTH = 360;
export const SHARE_CARD_HEIGHT = 640;
const MAP_HEIGHT = 440;
const OVERLAY_HEIGHT = SHARE_CARD_HEIGHT - MAP_HEIGHT;

export interface ActivityShareCardProps {
  activity: ActivityDisplay;
  mapRegion: MapRegion | null;
  routeCoords: { latitude: number; longitude: number }[];
  paceMps: number;
}

export function ActivityShareCard({
  activity,
  mapRegion,
  routeCoords,
  paceMps,
}: ActivityShareCardProps): React.ReactElement {
  const run = activity.run;
  const hasStats = run && (run.distance > 0 || run.duration > 0);

  return (
    <View style={styles.card}>
      {mapRegion && routeCoords.length > 0 ? (
        <MapView
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={mapRegion}
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          userInterfaceStyle="dark"
          mapType={Platform.OS === "android" ? "none" : "mutedStandard"}
          {...(Platform.OS === "android" && { customMapStyle: darkMapStyle })}
        >
          <Polyline
            coordinates={routeCoords}
            strokeColor={colors.primary}
            strokeWidth={6}
            lineCap="round"
            lineJoin="round"
          />
        </MapView>
      ) : (
        <View style={[styles.map, styles.mapPlaceholder]}>
          <Text style={styles.placeholderText}>No route</Text>
        </View>
      )}
      <View style={styles.overlay}>
        <View style={styles.overlayContent}>
          <Text style={styles.title} numberOfLines={1}>
            {activity.title}
          </Text>
          {hasStats && run ? (
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
                  <Text style={styles.statValue}>
                    {formatPace(paceMps)}
                    <Text style={styles.statUnit}>/km</Text>
                  </Text>
                  <Text style={styles.statLabel}>Pace</Text>
                </View>
              ) : null}
            </View>
          ) : null}
          <Text style={styles.brand}>Territory</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    overflow: "hidden",
    backgroundColor: colors.background,
  },
  map: {
    width: SHARE_CARD_WIDTH,
    height: MAP_HEIGHT,
  },
  mapPlaceholder: {
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: 16,
    color: colors.mutedForeground,
  },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: OVERLAY_HEIGHT,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 41, 0.92)",
  },
  overlayContent: {},
  title: {
    fontFamily: typography.display,
    fontSize: 20,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xl,
    marginBottom: spacing.md,
  },
  stat: { minWidth: 72 },
  statValue: {
    fontFamily: typography.display,
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
  },
  statUnit: { fontSize: 16, fontWeight: "600", color: colors.mutedForeground },
  statLabel: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  brand: {
    fontFamily: typography.display,
    fontSize: 14,
    fontWeight: "700",
    color: colors.mutedForeground,
    letterSpacing: 2,
  },
});
