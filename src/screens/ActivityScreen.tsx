import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { BlurView } from "expo-blur";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabase/client";
import { colors, radius, spacing, typography } from "../theme";
import type { ActivityDisplay } from "../types/domain";
import { getActivityIcon, getActivityColor } from "../constants/activity";
import { timeAgo } from "../utils/format";

export default function ActivityScreen(): React.ReactElement {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("activities")
        .select("id, type, title, description, is_urgent, created_at")
        .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(30);
      if (!cancelled && data) setActivities(data as ActivityDisplay[]);
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
    return (
      <BlurView
        key={item.id}
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
        </View>
        <Text style={styles.cardTime}>{timeAgo(item.created_at)}</Text>
      </BlurView>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>ACTIVITY</Text>
      {loading ? (
        <View style={styles.placeholder}>
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
  cardTime: { fontSize: 10, color: colors.mutedForeground, marginLeft: spacing.sm },
  placeholder: { padding: spacing["2xl"] },
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
