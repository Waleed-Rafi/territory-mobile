import * as QueryParams from "expo-auth-session/build/QueryParams";
import { supabase } from "../supabase/client";

/**
 * Parse OAuth callback URL and set Supabase session.
 * Used after Google sign-in redirect (openAuthSessionAsync) or deep link (magic link, etc.).
 */
export async function createSessionFromUrl(url: string): Promise<void> {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);
  const { access_token, refresh_token } = params;
  if (!access_token) return;
  const { error } = await supabase.auth.setSession({
    access_token,
    refresh_token: refresh_token ?? "",
  });
  if (error) throw error;
}
