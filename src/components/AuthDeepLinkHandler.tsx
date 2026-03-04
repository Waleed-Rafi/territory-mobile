import { useEffect } from "react";
import * as Linking from "expo-linking";
import { createSessionFromUrl } from "../utils/authCallback";

/**
 * Handles auth callback deep links (e.g. territory://auth/callback#...).
 * Needed when app opens from background/cold start after OAuth redirect.
 */
export function AuthDeepLinkHandler(): null {
  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url || !url.includes("auth/callback")) return;
      try {
        await createSessionFromUrl(url);
      } catch {
        // Session may already be set; ignore
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener("url", ({ url }) => void handleUrl(url));
    return () => sub.remove();
  }, []);

  return null;
}
