/**
 * Modal to preview the activity share card, then Save to photos or Share (story/apps).
 * Captures the card view and uses expo-media-library and expo-sharing.
 */

import React, { useRef, useState, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { captureRef } from "react-native-view-shot";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { X } from "lucide-react-native";
import { ActivityShareCard, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT } from "./ActivityShareCard";
import { colors, spacing, typography } from "../theme";
import { polylineToMapRegion, MAP_FIT_TIGHT } from "../lib/gps";
import type { ActivityDisplay } from "../types/domain";
import { strings } from "../l10n/strings";

/** Output image size for story (9:16). */
const CAPTURE_WIDTH = 1080;
const CAPTURE_HEIGHT = 1920;

export interface ShareActivityModalProps {
  visible: boolean;
  onClose: () => void;
  activity: ActivityDisplay;
}

export function ShareActivityModal({
  visible,
  onClose,
  activity,
}: ShareActivityModalProps): React.ReactElement {
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState<"save" | "share" | null>(null);

  const run = activity.run;
  const routeCoords = useMemo(
    () =>
      run?.route_polyline?.map(([lat, lng]) => ({ latitude: lat, longitude: lng })) ?? [],
    [run?.route_polyline]
  );
  const mapRegion = useMemo(() => {
    if (!run?.route_polyline?.length) return null;
    const aspect = SHARE_CARD_WIDTH / 440;
    return polylineToMapRegion(run.route_polyline, MAP_FIT_TIGHT, aspect);
  }, [run?.route_polyline]);

  const paceMps =
    run != null && run.duration > 0
      ? run.avg_pace != null
        ? 1000 / (run.avg_pace * 60)
        : run.distance / run.duration
      : 0;

  const captureCard = async (): Promise<string | null> => {
    if (!cardRef.current) return null;
    try {
      const uri = await captureRef(cardRef, {
        format: "jpg",
        quality: 0.95,
        width: CAPTURE_WIDTH,
        height: CAPTURE_HEIGHT,
        result: "tmpfile",
      });
      return uri;
    } catch (e) {
      console.warn("Share capture failed:", e);
      return null;
    }
  };

  const handleSaveToPhotos = async () => {
    setBusy("save");
    const uri = await captureCard();
    setBusy(null);
    if (!uri) {
      Alert.alert(strings.common.error, strings.activity.shareError);
      return;
    }
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          strings.common.error,
          strings.activity.saveError,
          [{ text: strings.common.ok }]
        );
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert(strings.activity.savedToPhotos, "", [
        { text: strings.common.ok, onPress: onClose },
      ]);
    } catch {
      Alert.alert(strings.common.error, strings.activity.saveError, [
        { text: strings.common.ok },
      ]);
    }
  };

  const handleShare = async () => {
    setBusy("share");
    const uri = await captureCard();
    setBusy(null);
    if (!uri) {
      Alert.alert(strings.common.error, strings.activity.shareError);
      return;
    }
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert(strings.common.error, strings.activity.shareError);
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: "image/jpeg",
        dialogTitle: strings.activity.shareCardTitle,
      });
      onClose();
    } catch {
      Alert.alert(strings.common.error, strings.activity.shareError);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{strings.activity.shareCardTitle}</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel={strings.common.cancel}
            >
              <X size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <View style={styles.cardWrap} collapsable={false} ref={cardRef}>
            <ActivityShareCard
              activity={activity}
              mapRegion={mapRegion}
              routeCoords={routeCoords}
              paceMps={paceMps}
            />
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSaveToPhotos}
              disabled={!!busy}
              accessibilityRole="button"
              accessibilityLabel={strings.activity.saveToPhotosA11y}
            >
              {busy === "save" ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.saveButtonText}>{strings.activity.saveToPhotos}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.shareButton]}
              onPress={handleShare}
              disabled={!!busy}
              accessibilityRole="button"
              accessibilityLabel={strings.activity.shareToStoryA11y}
            >
              {busy === "share" ? (
                <ActivityIndicator color={colors.foreground} />
              ) : (
                <Text style={styles.shareButtonText}>{strings.activity.shareToStory}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  container: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: typography.display,
    fontSize: 18,
    fontWeight: "700",
    color: colors.foreground,
    letterSpacing: 1,
  },
  closeBtn: {
    padding: spacing.sm,
  },
  cardWrap: {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    marginBottom: spacing.xl,
    overflow: "hidden",
    backgroundColor: colors.background,
  },
  actions: {
    width: "100%",
    gap: spacing.md,
  },
  button: {
    paddingVertical: spacing.lg,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    fontFamily: typography.display,
    fontSize: 16,
    fontWeight: "700",
    color: colors.background,
  },
  shareButton: {
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  shareButtonText: {
    fontFamily: typography.display,
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
  },
});
