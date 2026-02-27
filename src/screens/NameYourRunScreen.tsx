import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
} from "react-native";
import MapView, { Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Camera, X } from "lucide-react-native";
import { ProfileStackHeader } from "../components/ProfileStackHeader";
import { useAuth } from "../contexts/AuthContext";
import { useAlert } from "../contexts/AlertContext";
import { supabase } from "../supabase/client";
import { Loader } from "../components/Loaders";
import { colors, radius, spacing, typography } from "../theme";
import { darkMapStyle } from "../theme/mapStyle";
import { strings } from "../l10n/strings";
import { polylineToMapRegion } from "../lib/gps";
import type { RootStackParamList } from "../types/navigation";
import type { ActivityInsert } from "../types/database";
import { ActivityType } from "../types/domain";

type RouteProp = import("@react-navigation/native").RouteProp<RootStackParamList, "NameYourRun">;
type NavProp = NativeStackNavigationProp<RootStackParamList, "NameYourRun">;

function defaultRunName(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morning run";
  if (h < 17) return "Afternoon run";
  return "Evening run";
}

export default function NameYourRunScreen(): React.ReactElement {
  const route = useRoute<RouteProp>();
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();
  const alert = useAlert();
  const { runId, routePolyline, activityType, suggestedTitle, suggestedDescription } = route.params;

  const [name, setName] = useState(defaultRunName());
  const [description, setDescription] = useState("");
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const routeCoords = useMemo(
    () =>
      routePolyline.map(([lat, lng]) => ({ latitude: lat, longitude: lng })),
    [routePolyline]
  );
  const mapRegion = useMemo(
    () => polylineToMapRegion(routePolyline, 1.5),
    [routePolyline]
  );

  const pickImage = async () => {
    try {
      const ImagePicker = await import("expo-image-picker");
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        alert.show("Permission needed", "Allow photo access to add run photos.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets.length) {
        setPhotoUris((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
      }
    } catch {
      alert.show(
        "Photo picker unavailable",
        "Use the Territory app you built with “npx expo run:android” (not Expo Go) to add photos."
      );
    }
  };

  const removePhoto = (index: number) => {
    setPhotoUris((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (): Promise<string[]> => {
    if (!user || photoUris.length === 0) return [];
    const paths: string[] = [];
    for (let i = 0; i < photoUris.length; i++) {
      const uri = photoUris[i];
      const ext = uri.split(".").pop()?.toLowerCase() === "png" ? "png" : "jpg";
      const path = `${user.id}/${runId}/${Date.now()}-${Math.random().toString(36).slice(2, 11)}.${ext}`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const { error } = await supabase.storage.from("run-photos").upload(path, blob, {
        contentType: ext === "png" ? "image/png" : "image/jpeg",
        upsert: false,
      });
      if (error) throw error;
      paths.push(path);
    }
    return paths;
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      alert.show("Name required", "Give your run a name.");
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      let photoUrls: string[] = [];
      try {
        photoUrls = await uploadPhotos();
      } catch (e) {
        alert.show("Upload failed", "Could not upload some photos. Save without them?");
        const choice = await alert.showAsync({
          title: "Save anyway?",
          message: "You can add photos later.",
          buttons: [
            { text: "Cancel", style: "cancel" },
            { text: "Save" },
          ],
        });
        if (choice !== 1) {
          setSaving(false);
          return;
        }
      }

      const { error: updateError } = await supabase
        .from("runs")
        .update({
          name: trimmedName,
          description: description.trim() || null,
          photo_urls: photoUrls.length ? photoUrls : null,
        })
        .eq("id", runId)
        .eq("user_id", user.id);
      if (updateError) throw updateError;

      const activityData: ActivityInsert = {
        user_id: user.id,
        type: activityType === "territory_claimed" ? ActivityType.TerritoryClaimed : ActivityType.RunCompleted,
        title: trimmedName,
        description: (description.trim() || suggestedDescription) || null,
        run_id: runId,
      };
      const { error: activityError } = await supabase.from("activities").insert(activityData);
      if (activityError) throw activityError;

      alert.show({
        title: "Saved",
        message: activityType === "territory_claimed" ? "Territory claimed!" : "Run saved!",
        buttons: [{ text: "OK", onPress: () => navigation.goBack() }],
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to save";
      alert.show("Error", message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ProfileStackHeader title="Name your run" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.subtitle}>Add a name, optional description and photos. Your route is saved below.</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Evening run"
          placeholderTextColor={colors.mutedForeground}
          maxLength={80}
        />

        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="How did it go? Route, weather..."
          placeholderTextColor={colors.mutedForeground}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Photos (optional)</Text>
        <View style={styles.photoRow}>
          <TouchableOpacity style={styles.addPhoto} onPress={pickImage}>
            <Camera size={24} color={colors.primary} />
            <Text style={styles.addPhotoText}>Add photos</Text>
          </TouchableOpacity>
          {photoUris.map((uri, i) => (
            <View key={i} style={styles.photoWrap}>
              <Image source={{ uri }} style={styles.thumbnail} />
              <TouchableOpacity style={styles.removePhoto} onPress={() => removePhoto(i)}>
                <X size={14} color={colors.foreground} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <Text style={styles.label}>Route</Text>
        <View style={styles.mapWrap}>
          {mapRegion && (
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
              <Polyline coordinates={routeCoords} strokeColor={colors.primary} strokeWidth={4} />
            </MapView>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={strings.run.saveRun}
        >
          {saving ? (
            <Loader type="spinner" color={colors.primaryForeground} />
          ) : (
            <Text style={styles.saveBtnText}>Save run</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing["2xl"],
  },
  title: {
    fontFamily: typography.display,
    fontSize: 22,
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.body,
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: spacing.xl,
  },
  label: {
    fontFamily: typography.bodyMedium,
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.input,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: typography.body,
    fontSize: 16,
    color: colors.foreground,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  photoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  addPhoto: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoText: {
    fontFamily: typography.body,
    fontSize: 12,
    color: colors.primary,
    marginTop: 4,
  },
  photoWrap: {
    position: "relative",
  },
  thumbnail: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
  },
  removePhoto: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.destructive,
    alignItems: "center",
    justifyContent: "center",
  },
  mapWrap: {
    height: 160,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.secondary,
    marginBottom: spacing.xl,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    fontFamily: typography.bodyMedium,
    fontSize: 16,
    color: colors.primaryForeground,
  },
});
