import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import MapView, { Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import { BlurView } from "expo-blur";
import { useRoute, RouteProp } from "@react-navigation/native";
import { colors, radius, spacing, typography } from "../theme";
import { polylineToMapRegion } from "../lib/gps";
import { RunPhotoThumbnail } from "../components/RunPhotoThumbnail";
import { getActivityIcon, getActivityColor } from "../constants/activity";
import { timeAgo } from "../utils/format";
import type { RootStackParamList } from "../types/navigation";
import type { ActivityDisplay } from "../types/domain";

type ActivityDetailRouteProp = RouteProp<RootStackParamList, "ActivityDetail">;

export default function ActivityDetailScreen(): React.ReactElement {
  const route = useRoute<ActivityDetailRouteProp>();
  const { activity } = route.params;
  const run = activity.run;
  const routeCoords =
    run?.route_polyline?.length &&
    run.route_polyline.map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
  const mapRegion = run?.route_polyline?.length ? polylineToMapRegion(run.route_polyline, 1.8) : null;

  const Icon = getActivityIcon(activity.type);
  const color = getActivityColor(activity.type);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <BlurView intensity={70} tint="dark" style={[styles.card, activity.is_urgent && styles.cardUrgent]}>
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
        </BlurView>

        {run ? (
          <>
            {(run.name || run.description) ? (
              <BlurView intensity={70} tint="dark" style={styles.section}>
                {run.name ? <Text style={styles.runName}>{run.name}</Text> : null}
                {run.description ? <Text style={styles.runDesc}>{run.description}</Text> : null}
              </BlurView>
            ) : null}
            {run.photo_urls && run.photo_urls.length > 0 ? (
              <BlurView intensity={70} tint="dark" style={styles.section}>
                <Text style={styles.sectionLabel}>Photos</Text>
                <View style={styles.photoRow}>
                  {run.photo_urls.map((path, i) => (
                    <RunPhotoThumbnail key={i} path={path} size={100} />
                  ))}
                </View>
              </BlurView>
            ) : null}
            {mapRegion && routeCoords && routeCoords.length > 0 ? (
              <BlurView intensity={70} tint="dark" style={styles.section}>
                <Text style={styles.sectionLabel}>Route</Text>
                <View style={styles.mapWrap}>
                  <MapView
                    style={styles.detailMap}
                    provider={PROVIDER_DEFAULT}
                    initialRegion={mapRegion}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    pitchEnabled={false}
                  >
                    <Polyline coordinates={routeCoords} strokeColor={colors.primary} strokeWidth={4} />
                  </MapView>
                </View>
              </BlurView>
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
  scrollContent: { padding: spacing.lg, paddingBottom: 40 },
  card: {
    overflow: "hidden",
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  cardUrgent: { borderLeftWidth: 3, borderLeftColor: colors.enemy },
  headerRow: { flexDirection: "row", alignItems: "flex-start" },
  iconWrap: { marginRight: spacing.md },
  titleWrap: { flex: 1, minWidth: 0 },
  title: { fontSize: 18, fontWeight: "700", color: colors.foreground, fontFamily: typography.display },
  time: { fontSize: 12, color: colors.mutedForeground, marginTop: 4 },
  description: { fontSize: 14, color: colors.mutedForeground, marginTop: spacing.md, lineHeight: 20 },
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
    fontWeight: "600",
    color: colors.mutedForeground,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  runName: { fontSize: 16, fontWeight: "600", color: colors.foreground },
  runDesc: { fontSize: 14, color: colors.mutedForeground, marginTop: 4, lineHeight: 20 },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  mapWrap: { height: 220, borderRadius: radius.sm, overflow: "hidden", backgroundColor: colors.secondary },
  detailMap: { flex: 1, width: "100%", height: "100%" },
});
