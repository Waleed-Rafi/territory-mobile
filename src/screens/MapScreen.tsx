import React, { useEffect, useState, useRef, useCallback } from "react";
import { View, Text, StyleSheet, Platform, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import MapView, { Polygon, PROVIDER_DEFAULT } from "react-native-maps";
import { BlurView } from "expo-blur";
import * as Location from "expo-location";
import { MapPin } from "lucide-react-native";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabase/client";
import { Loader } from "../components/Loaders";
import { colors, radius, spacing, typography } from "../theme";
import type { TerritoryMapItem } from "../types/domain";
import type { MapScreenNavigationProp } from "../types/navigation";

interface UserLocation {
  latitude: number;
  longitude: number;
}

const DEFAULT_REGION_DELTA = { latitudeDelta: 0.005, longitudeDelta: 0.005 };

/** Fallback when location is unavailable (e.g. permission denied) – Pakistan center. */
const FALLBACK_LOCATION: UserLocation = { latitude: 33.6844, longitude: 73.0479 };

function territoryColor(isOwned: boolean, strength: number): string {
  if (isOwned) return colors.territoryOwned;
  if (strength < 30) return colors.territoryWeak;
  return colors.territoryEnemy;
}

const LOCATION_RETRY_DELAY_MS = 2500;
const LOCATION_MAX_RETRIES = 3;
const LOCATION_WATCH_TIMEOUT_MS = 12000;

const locationOptions: Location.LocationOptions = {
  accuracy: Location.Accuracy.BestForNavigation,
  ...(Platform.OS === "android" && { mayShowUserSettingsDialog: true }),
};

/** Get current position with retries (mobile GPS can be slow). */
async function getCurrentPositionWithRetries(): Promise<UserLocation | null> {
  for (let attempt = 0; attempt < LOCATION_MAX_RETRIES; attempt++) {
    try {
      const loc = await Location.getCurrentPositionAsync(locationOptions);
      return {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
    } catch {
      if (attempt < LOCATION_MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, LOCATION_RETRY_DELAY_MS));
      } else {
        return null;
      }
    }
  }
  return null;
}

/**
 * Prefer a short watch to get a fresh fix on mobile (avoids stale/cached location).
 * Falls back to getCurrentPositionAsync with retries if watch times out.
 */
async function fetchUserLocation(): Promise<UserLocation | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;

    let watchSub: Location.LocationSubscription | null = null;

    return await new Promise<UserLocation | null>((resolve) => {
      let resolved = false;
      const doResolve = (loc: UserLocation | null) => {
        if (resolved) return;
        resolved = true;
        watchSub?.remove();
        watchSub = null;
        resolve(loc);
      };

      const timeoutId = setTimeout(async () => {
        if (resolved) return;
        const loc = await getCurrentPositionWithRetries();
        doResolve(loc);
      }, LOCATION_WATCH_TIMEOUT_MS);

      void Location.watchPositionAsync(
        locationOptions,
        (loc) => {
          if (resolved) return;
          clearTimeout(timeoutId);
          doResolve({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        },
        () => {}
      ).then((sub) => {
        watchSub = sub;
      });
    });
  } catch {
    return getCurrentPositionWithRetries();
  }
}

export default function MapScreen(): React.ReactElement {
  const { user } = useAuth();
  const navigation = useNavigation<MapScreenNavigationProp>();
  const mapRef = useRef<MapView | null>(null);
  const [territories, setTerritories] = useState<TerritoryMapItem[]>([]);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  const centerOnUser = useCallback(async () => {
    const loc = await fetchUserLocation();
    if (loc) {
      setUserLocation(loc);
      mapRef.current?.animateToRegion({
        ...loc,
        ...DEFAULT_REGION_DELTA,
      }, 500);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const loc = await fetchUserLocation();
      if (cancelled) return;
      setUserLocation(loc ?? FALLBACK_LOCATION);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!userLocation) return;
    const { latitude, longitude } = userLocation;
    const region = { latitude, longitude, ...DEFAULT_REGION_DELTA };
    const t = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.animateToRegion(region, 400);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [userLocation?.latitude, userLocation?.longitude]);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      const { data } = await supabase
        .from("territories")
        .select("id, owner_id, polygon, strength, center_lat, center_lng, area_sqm");
      if (!data || cancelled) return;
      type Row = { owner_id: string; polygon: unknown; [k: string]: unknown };
      const rows = data as Row[];
      const ownerIds = [...new Set(rows.map((t) => t.owner_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username")
        .in("user_id", ownerIds);
      const profileMap = new Map(
        (profiles ?? []).map((p: { user_id: string; username: string | null }) => [
          p.user_id,
          p.username ?? "Unknown",
        ])
      );
      const items: TerritoryMapItem[] = rows.map((t) => ({
        id: t.id as string,
        owner_id: t.owner_id,
        polygon: t.polygon as [number, number][],
        strength: t.strength as number,
        center_lat: t.center_lat as number,
        center_lng: t.center_lng as number,
        area_sqm: t.area_sqm as number,
        owner_username: profileMap.get(t.owner_id) ?? "Unknown",
      }));
      if (!cancelled) setTerritories(items);
    };
    void load();
    const channel = supabase
      .channel("territories-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "territories" }, () => {
        void load();
      })
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const owned = territories.filter((t) => t.owner_id === user?.id);
  const ownedArea = owned.reduce((sum, t) => sum + t.area_sqm, 0) / 1e6;

  if (!userLocation) {
    return (
      <View style={[styles.container, styles.centered, styles.loadingColumn]}>
        <Loader type="dots" color={colors.primary} />
        <Text style={styles.loadingText}>Loading map…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          ...userLocation,
          ...DEFAULT_REGION_DELTA,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        followsUserLocation={false}
        mapType={Platform.OS === "android" ? "none" : "mutedStandard"}
        {...(Platform.OS === "android" && { customMapStyle: darkMapStyle })}
      >
        {territories.map((t) => {
          const isOwned = t.owner_id === user?.id;
          const color = territoryColor(isOwned, t.strength);
          const coords = t.polygon.map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
          if (coords.length < 2) return null;
          return (
            <Polygon
              key={t.id}
              coordinates={coords}
              fillColor={color + "40"}
              strokeColor={color}
              strokeWidth={isOwned ? 2 : 1}
            />
          );
        })}
      </MapView>

      <View style={styles.header} pointerEvents="box-none">
        <BlurView intensity={70} tint="dark" style={styles.glass}>
          <Text style={styles.title}>TERRITORY</Text>
        </BlurView>
        <BlurView intensity={70} tint="dark" style={styles.glass}>
          <View style={styles.dot} />
          <Text style={styles.zonesText}>{territories.length} zones</Text>
        </BlurView>
      </View>

      <View style={styles.legend} pointerEvents="box-none">
        <BlurView intensity={70} tint="dark" style={styles.glassLegend}>
          <View style={styles.legendRow}>
            <View style={[styles.legendSwatch, { backgroundColor: colors.territoryOwned }]} />
            <Text style={styles.legendLabel}>Your Territory</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendSwatch, { backgroundColor: colors.territoryEnemy }]} />
            <Text style={styles.legendLabel}>Enemy</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendSwatch, { backgroundColor: colors.territoryWeak, opacity: 0.5 }]} />
            <Text style={styles.legendLabel}>Decaying</Text>
          </View>
        </BlurView>
      </View>

      <View style={styles.stats} pointerEvents="box-none">
        <BlurView intensity={70} tint="dark" style={styles.glassStats}>
          <Text style={styles.statsLabel}>Territories</Text>
          <Text style={styles.statsValue}>{owned.length}</Text>
          <Text style={styles.statsSub}>{ownedArea.toFixed(3)} km²</Text>
        </BlurView>
      </View>

      <TouchableOpacity
        onPress={centerOnUser}
        style={styles.myLocationButton}
        activeOpacity={0.9}
      >
        <MapPin size={22} stroke={colors.primaryForeground} />
      </TouchableOpacity>

      <View style={styles.actions} pointerEvents="box-none">
        <TouchableOpacity
          onPress={() => navigation.navigate("Run")}
          style={styles.primaryButton}
          activeOpacity={0.9}
        >
          <Text style={styles.primaryButtonText}>START RUN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0f1729" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f1729" }] },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { justifyContent: "center", alignItems: "center" },
  loadingColumn: { gap: spacing.md },
  loadingText: { color: colors.mutedForeground, fontSize: 14 },
  header: {
    position: "absolute",
    top: 72,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  glass: {
    overflow: "hidden",
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontFamily: typography.display,
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  zonesText: { fontSize: 12, color: colors.secondaryForeground },
  legend: {
    position: "absolute",
    bottom: 100 + 62 + spacing.lg,
    left: spacing.lg,
  },
  glassLegend: {
    overflow: "hidden",
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 4 },
  legendSwatch: { width: 12, height: 12, borderRadius: 3 },
  legendLabel: { fontSize: 11, color: colors.secondaryForeground },
  stats: {
    position: "absolute",
    bottom: 100 + 62 + spacing.lg,
    right: spacing.lg,
  },
  glassStats: {
    overflow: "hidden",
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: "flex-end",
  },
  statsLabel: { fontSize: 10, color: colors.mutedForeground, letterSpacing: 1 },
  statsValue: { fontFamily: typography.mono, fontSize: 22, fontWeight: "700", color: colors.primary },
  statsSub: { fontSize: 10, color: colors.mutedForeground, marginTop: 4 },
  actions: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  primaryButton: {
    borderRadius: radius.xl,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButtonText: {
    fontFamily: typography.display,
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 2,
    color: colors.primaryForeground,
  },
  myLocationButton: {
    position: "absolute",
    top: 120,
    right: spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
});
