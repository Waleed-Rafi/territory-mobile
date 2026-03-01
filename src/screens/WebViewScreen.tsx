import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { WebView } from "react-native-webview";
import { X } from "lucide-react-native";
import { colors, spacing, typography } from "../theme";
import type { RootStackParamList } from "../types/navigation";

type WebViewRouteProp = RouteProp<RootStackParamList, "WebView">;

export default function WebViewScreen(): React.ReactElement {
  const route = useRoute<WebViewRouteProp>();
  const navigation = useNavigation();
  const { url, title = "Page" } = route.params;
  const [loading, setLoading] = useState(true);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <X size={24} stroke={colors.foreground} />
        </TouchableOpacity>
      </View>
      <View style={styles.webViewWrap}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        )}
        <WebView
          source={{ uri: url }}
          style={styles.webView}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => setLoading(false)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 56 : 48,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    flex: 1,
    fontFamily: typography.display,
    fontSize: 18,
    fontWeight: "700",
    color: colors.foreground,
    letterSpacing: 1,
    marginRight: spacing.sm,
  },
  closeButton: {
    padding: spacing.sm,
  },
  webViewWrap: { flex: 1, position: "relative" },
  webView: { flex: 1, backgroundColor: colors.background },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 12,
    color: colors.mutedForeground,
    fontFamily: typography.display,
    letterSpacing: 1,
  },
});
