import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import MapView, { Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import { Play, Square, MapPin, Ruler, Gauge, AlertTriangle, CheckCircle } from "lucide-react-native";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabase/client";
import { useRunTracking } from "../hooks/useRunTracking";
import {
  calculateTotalDistance,
  isClosedLoop,
  validateRun,
  pointsToPolygon,
  calculatePolygonArea,
  getPolygonCenter,
  formatDistance,
  formatDuration,
  formatPace,
} from "../lib/gps";
import { colors, radius, spacing, typography } from "../theme";
import { BlurView } from "expo-blur";
import type { RunInsert, ActivityInsert, TerritoryInsert } from "../types/database";
import { ActivityType } from "../types/domain";

/** Fallback when no location/route yet – Pakistan center (matches MapScreen). */
const FALLBACK_MAP_CENTER = { latitude: 33.6844, longitude: 73.0479 };

export default function RunScreen(): React.ReactElement {
  const { user } = useAuth();
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  const { tracking, points, currentPosition, error, startTracking, stopTracking } = useRunTracking();
  const mapRef = useRef<MapView | null>(null);
  const totalDistance = calculateTotalDistance(points);
  const avgSpeed = elapsed > 0 ? totalDistance / elapsed : 0;
  const closedLoop = points.length > 10 && isClosedLoop(points);

  const routeCoordinates = points.map((p) => ({ latitude: p.lat, longitude: p.lng }));
  const mapCenter = currentPosition
    ? { latitude: currentPosition.coords.latitude, longitude: currentPosition.coords.longitude }
    : routeCoordinates.length > 0
      ? { latitude: routeCoordinates[0].latitude, longitude: routeCoordinates[0].longitude }
      : null;

  useEffect(() => {
    if (!tracking) return;
    startTimeRef.current = new Date();
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [tracking]);

  useEffect(() => {
    if (!tracking) return;
    if (routeCoordinates.length === 1 && mapCenter) {
      mapRef.current?.animateToRegion(
        { ...mapCenter, latitudeDelta: 0.002, longitudeDelta: 0.002 },
        350
      );
      return;
    }
    if (routeCoordinates.length < 2) return;
    const coords = currentPosition
      ? [...routeCoordinates, { latitude: currentPosition.coords.latitude, longitude: currentPosition.coords.longitude }]
      : routeCoordinates;
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 48, right: 24, bottom: 24, left: 24 },
      animated: true,
    });
  }, [tracking, routeCoordinates.length]);

  const handleStart = () => {
    startTracking();
  };

  const handleStop = async () => {
    stopTracking();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (!user || points.length < 5) {
      Alert.alert("Error", "Run too short to save");
      return;
    }
    setSaving(true);
    const validation = validateRun(points);
    const canClaimTerritory = closedLoop && validation.valid;

    try {
      const runData: RunInsert = {
        user_id: user.id,
        distance: totalDistance,
        duration: elapsed,
        avg_pace: avgSpeed > 0 ? 1000 / avgSpeed / 60 : null,
        gps_points: points as unknown as RunInsert["gps_points"],
        route_polyline: points.map((p) => [p.lat, p.lng]),
        is_valid: validation.valid,
        territory_claimed: false,
        started_at: startTimeRef.current?.toISOString(),
        finished_at: new Date().toISOString(),
      };
      const { data: run, error: runError } = await supabase
        .from("runs")
        .insert(runData)
        .select()
        .single();
      if (runError) throw runError;

      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("total_distance, total_runs")
        .eq("user_id", user.id)
        .single();
      if (currentProfile) {
        await supabase
          .from("profiles")
          .update({
            total_distance: (currentProfile.total_distance || 0) + totalDistance,
            total_runs: (currentProfile.total_runs || 0) + 1,
          })
          .eq("user_id", user.id);
      }

      if (canClaimTerritory && run) {
        const polygon = pointsToPolygon(points);
        const area = calculatePolygonArea(polygon);
        const center = getPolygonCenter(polygon);
        const territoryData: TerritoryInsert = {
          owner_id: user.id,
          polygon,
          center_lat: center.lat,
          center_lng: center.lng,
          area_sqm: area,
          strength: 100,
          created_from_run_id: run.id,
        };
        const { error: terrError } = await supabase.from("territories").insert(territoryData);
        if (!terrError) {
          const activityData: ActivityInsert = {
            user_id: user.id,
            type: ActivityType.TerritoryClaimed,
            title: "New Territory Claimed!",
            description: `Claimed ${(area / 1e6).toFixed(3)} km² with a ${formatDistance(totalDistance)} run`,
            run_id: run.id,
          };
          await supabase.from("activities").insert(activityData);
          Alert.alert("Success", "Territory claimed! 🏴");
        }
      } else {
        const activityData: ActivityInsert = {
          user_id: user.id,
          type: ActivityType.RunCompleted,
          title: "Run Completed",
          description: `${formatDistance(totalDistance)} in ${formatDuration(elapsed)}`,
          run_id: run.id,
        };
        await supabase.from("activities").insert(activityData);
        if (!validation.valid) {
          Alert.alert("Saved", "Run saved but not valid for territory: " + validation.reasons[0]);
        } else if (!closedLoop) {
          Alert.alert("Saved", "Run saved! Close the loop next time to claim territory.");
        } else {
          Alert.alert("Success", "Run saved!");
        }
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to save run";
      Alert.alert("Error", message);
    } finally {
      setSaving(false);
    }
  };

  const darkMapStyle = [
    { elementType: "geometry", stylers: [{ color: "#0f1729" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#0f1729" }] },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_DEFAULT}
          initialRegion={{
            latitude: mapCenter?.latitude ?? FALLBACK_MAP_CENTER.latitude,
            longitude: mapCenter?.longitude ?? FALLBACK_MAP_CENTER.longitude,
            latitudeDelta: 0.003,
            longitudeDelta: 0.003,
          }}
          showsUserLocation
          showsMyLocationButton={false}
          mapType={Platform.OS === "android" ? "none" : "mutedStandard"}
          {...(Platform.OS === "android" && { customMapStyle: darkMapStyle })}
        >
          {routeCoordinates.length >= 2 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={colors.primary}
              strokeWidth={4}
              lineCap="round"
              lineJoin="round"
            />
          )}
        </MapView>
        {!tracking && (
          <View style={styles.mapOverlay} pointerEvents="none">
            <Text style={styles.mapOverlayText}>Start run to track your route</Text>
          </View>
        )}
        {tracking && (
          <View style={styles.gpsBar}>
            <BlurView intensity={60} tint="dark" style={styles.gpsGlass}>
              <View style={styles.gpsDot} />
              <Text style={styles.gpsText}>
                GPS · {points.length} pts · {currentPosition?.coords.accuracy?.toFixed(0) ?? "—"}m
              </Text>
            </BlurView>
          </View>
        )}
      </View>

      {error && (
        <View style={styles.errorBar}>
          <AlertTriangle size={14} stroke={colors.destructive} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.durationLabel}>Duration</Text>
        <Text style={styles.durationValue}>{formatDuration(elapsed)}</Text>

        <View style={styles.statsRow}>
          <BlurView intensity={70} tint="dark" style={styles.statCard}>
            <Ruler size={14} stroke={colors.mutedForeground} style={styles.statIcon} />
            <Text style={styles.statValue}>{formatDistance(totalDistance)}</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </BlurView>
          <BlurView intensity={70} tint="dark" style={styles.statCard}>
            <Gauge size={14} stroke={colors.mutedForeground} style={styles.statIcon} />
            <Text style={styles.statValue}>{formatPace(avgSpeed)}</Text>
            <Text style={styles.statLabel}>Pace</Text>
          </BlurView>
          <BlurView intensity={70} tint="dark" style={styles.statCard}>
            <MapPin size={14} stroke={colors.mutedForeground} style={styles.statIcon} />
            <Text style={[styles.statValue, closedLoop && styles.statValuePrimary]}>
              {closedLoop ? "✓" : "—"}
            </Text>
            <Text style={styles.statLabel}>Loop</Text>
          </BlurView>
        </View>

        {tracking && closedLoop && (
          <View style={styles.loopBar}>
            <BlurView intensity={70} tint="dark" style={styles.loopGlass}>
              <CheckCircle size={14} stroke={colors.primary} />
              <Text style={styles.loopText}>Loop closed! Stop now to claim territory</Text>
            </BlurView>
          </View>
        )}

        <TouchableOpacity
          onPress={tracking ? handleStop : handleStart}
          disabled={saving}
          style={[
            styles.mainButton,
            tracking && styles.mainButtonStop,
            saving && styles.mainButtonDisabled,
          ]}
          activeOpacity={0.9}
        >
          {saving ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : tracking ? (
            <Square size={28} color="#fff" fill="#fff" />
          ) : (
            <Play size={32} stroke={colors.primaryForeground} fill={colors.primaryForeground} />
          )}
        </TouchableOpacity>
        <Text style={styles.mainButtonLabel}>
          {saving ? "Saving run..." : tracking ? "Tap to finish" : "Start Run"}
        </Text>

        {!tracking && !saving && (
          <BlurView intensity={70} tint="dark" style={styles.tipCard}>
            <Text style={styles.tipText}>
              Run a closed loop of at least <Text style={styles.tipBold}>100m</Text> to claim
              territory. Your route becomes your domain.
            </Text>
          </BlurView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingBottom: 100,
  },
  mapContainer: {
    height: 220,
    width: "100%",
    overflow: "hidden",
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 41, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  mapOverlayText: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  gpsBar: {
    position: "absolute",
    top: 8,
    left: spacing.lg,
    right: spacing.lg,
  },
  gpsGlass: {
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  gpsDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  gpsText: { fontSize: 12, fontFamily: typography.mono, color: colors.primary },
  errorBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    backgroundColor: colors.glassBg,
  },
  errorText: { fontSize: 12, color: colors.destructive },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  durationLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    letterSpacing: 3,
    marginBottom: 8,
    marginTop: spacing.lg,
    textAlign: "center",
  },
  durationValue: {
    fontFamily: typography.mono,
    fontSize: 56,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: spacing["2xl"],
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.lg,
    marginBottom: spacing["2xl"],
    justifyContent: "center",
  },
  statCard: {
    overflow: "hidden",
    borderRadius: radius.lg,
    padding: spacing.md,
    minWidth: 96,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  statIcon: { marginBottom: 4 },
  statValue: { fontFamily: typography.mono, fontSize: 20, fontWeight: "700", color: colors.foreground },
  statValuePrimary: { color: colors.primary },
  statLabel: { fontSize: 10, color: colors.mutedForeground, marginTop: 2, letterSpacing: 1 },
  loopBar: { marginBottom: spacing.lg },
  loopGlass: {
    overflow: "hidden",
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(0, 255, 136, 0.3)",
  },
  loopText: { fontSize: 12, fontWeight: "500", color: colors.primary },
  mainButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
  mainButtonStop: { backgroundColor: colors.destructive },
  mainButtonDisabled: { opacity: 0.6 },
  mainButtonLabel: {
    marginTop: spacing.lg,
    fontSize: 12,
    color: colors.mutedForeground,
    letterSpacing: 2,
  },
  tipCard: {
    marginTop: spacing["2xl"],
    padding: spacing.lg,
    borderRadius: radius.lg,
    width: "100%",
    maxWidth: 360,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  tipText: { fontSize: 12, color: colors.mutedForeground, textAlign: "center" },
  tipBold: { fontWeight: "600", color: colors.primary },
});
