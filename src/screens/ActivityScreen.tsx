import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from "react-native";
import MapView, { Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import { BlurView } from "expo-blur";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabase/client";
import { Loader } from "../components/Loaders";
import { colors, radius, spacing, typography } from "../theme";
import type { ActivityDisplay, RunSummary } from "../types/domain";
import type { RootStackParamList } from "../types/navigation";
import { getActivityIcon, getActivityColor } from "../constants/activity";
import { timeAgo } from "../utils/format";

/** Thumbnail that loads a run photo from Supabase Storage (signed URL). */
function RunPhotoThumbnail({ path, size }: { path: string; size: number }): React.ReactElement {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase.storage
      .from("run-photos")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (!cancelled && data?.signedUrl) setUri(data.signedUrl);
      });
    return () => { cancelled = true; };
  }, [path]);
  if (!uri) return <View style={[styles.thumbPlaceholder, { width: size, height: size }]} />;
  return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius.sm }} />;
}

/** Normalize run from Supabase join (can be object or null). */
function normalizeRun(r: unknown): RunSummary | null {
  if (!r || typeof r !== "object") return null;
  const o = r as Record<string, unknown>;
  const photoUrls = o.photo_urls as string[] | unknown;
  const arr = Array.isArray(photoUrls) ? photoUrls : [];
  const poly = o.route_polyline as [number, number][] | unknown;
  const routePolyline = Array.isArray(poly) ? poly : null;
  return {
    name: (o.name as string | null) ?? null,
    description: (o.description as string | null) ?? null,
    photo_urls: arr.length ? arr : null,
    route_polyline: routePolyline,
  };
}

export default function ActivityScreen(): React.ReactElement {
  const { user } = useAuth();
  const navigation = useNavigation();
  const rootNav = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const [activities, setActivities] = useState<ActivityDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("activities")
        .select("id, type, title, description, is_urgent, created_at, run_id, runs(name, description, photo_urls, route_polyline)")
        .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(30);
      if (!cancelled && data) {
        const list = (data as Array<Record<string, unknown>>).map((row) => {
          const run = row.runs ? normalizeRun(row.runs) : null;
          const { runs: _, ...rest } = row;
          return { ...rest, run } as ActivityDisplay;
        });
        setActivities(list);
      }
      if (!cancelled) setLoading(false);
    })();
    const channel = supabase
      .channel("activities-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activities" },
        (payload) => {
          const newActivity = payload.new as ActivityDisplay;
          setActivities((prev) => [newActivity, ...prev]);
        }
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const renderItem = ({ item }: { item: ActivityDisplay }): React.ReactElement => {
    const Icon = getActivityIcon(item.type);
    const color = getActivityColor(item.type);
    const run = item.run;
    const routeCoords =
      run?.route_polyline?.length &&
      run.route_polyline.map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
    const mapRegion =
      routeCoords && routeCoords.length
        ? {
            latitude: (Math.min(...routeCoords.map((c) => c.latitude)) + Math.max(...routeCoords.map((c) => c.latitude))) / 2,
            longitude: (Math.min(...routeCoords.map((c) => c.longitude)) + Math.max(...routeCoords.map((c) => c.longitude))) / 2,
            latitudeDelta: Math.max(0.01, (Math.max(...routeCoords.map((c) => c.latitude)) - Math.min(...routeCoords.map((c) => c.latitude))) * 1.5 || 0.01),
            longitudeDelta: Math.max(0.01, (Math.max(...routeCoords.map((c) => c.longitude)) - Math.min(...routeCoords.map((c) => c.longitude))) * 1.5 || 0.01),
          }
        : null;

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.85}
        onPress={() => rootNav?.navigate("ActivityDetail", { activity: item })}
      >
        <BlurView
          intensity={70}
          tint="dark"
          style={[styles.card, item.is_urgent && styles.cardUrgent]}
        >
          <View style={styles.cardIcon}>
            <Icon size={18} color={color} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{item.title}</Text>
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
              <View style={styles.mapWrap}>
                <MapView
                  style={styles.miniMap}
                  provider={PROVIDER_DEFAULT}
                  initialRegion={mapRegion}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                >
                  <Polyline coordinates={routeCoords} strokeColor={colors.primary} strokeWidth={3} />
                </MapView>
              </View>
            ) : null}
          </View>
          <Text style={styles.cardTime}>{timeAgo(item.created_at)}</Text>
        </BlurView>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>ACTIVITY</Text>
      {loading ? (
        <View style={styles.placeholder}>
          <Loader type="skeleton" style={styles.skeletonWrap} />
          <Text style={styles.placeholderText}>Loading…</Text>
        </View>
      ) : activities.length === 0 ? (
        <BlurView intensity={70} tint="dark" style={styles.empty}>
          <Text style={styles.emptyText}>No activity yet. Start running to see your feed!</Text>
        </BlurView>
      ) : (
        <FlatList
          data={activities}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingTop: 56 },
  header: {
    fontFamily: typography.display,
    fontSize: 20,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: spacing.lg,
    letterSpacing: 2,
  },
  list: { paddingBottom: 100 },
  card: {
    overflow: "hidden",
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  cardUrgent: { borderLeftWidth: 2, borderLeftColor: colors.enemy },
  cardIcon: { marginRight: spacing.md, marginTop: 2 },
  cardContent: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  cardDesc: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  thumbPlaceholder: { backgroundColor: colors.secondary, borderRadius: radius.sm },
  mapWrap: { height: 100, borderRadius: radius.sm, overflow: "hidden", marginTop: spacing.sm, backgroundColor: colors.secondary },
  miniMap: { flex: 1, width: "100%", height: "100%" },
  cardTime: { fontSize: 10, color: colors.mutedForeground, marginLeft: spacing.sm },
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
