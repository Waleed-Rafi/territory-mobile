import React, { useEffect, useState } from "react";
import { View, Image, StyleSheet } from "react-native";
import { supabase } from "../supabase/client";
import { colors, radius } from "../theme";

const SIGNED_URL_EXPIRY_SEC = 3600;

export interface RunPhotoThumbnailProps {
  path: string;
  size: number;
}

/** Loads a run photo from Supabase Storage (signed URL) and shows a placeholder until ready. */
export function RunPhotoThumbnail({ path, size }: RunPhotoThumbnailProps): React.ReactElement {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.storage
      .from("run-photos")
      .createSignedUrl(path, SIGNED_URL_EXPIRY_SEC)
      .then(({ data }) => {
        if (!cancelled && data?.signedUrl) setUri(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!uri) {
    return <View style={[styles.placeholder, { width: size, height: size }]} />;
  }
  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: radius.sm }}
      accessibilityLabel="Run photo"
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.secondary,
    borderRadius: radius.sm,
  },
});
