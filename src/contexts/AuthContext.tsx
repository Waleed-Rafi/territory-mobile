import React, { createContext, useContext, useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "../supabase/client";
import type { AuthContextValue } from "../types/auth";

const defaultAuthValue: AuthContextValue = {
  user: null as User | null,
  session: null as Session | null,
  loading: true,
  signOut: async () => {},
};

const AuthContext = createContext<AuthContextValue>(defaultAuthValue);

export const useAuth = (): AuthContextValue => useContext(AuthContext);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const applySession = async (session: Session | null) => {
      setSession(session);
      setUser(session?.user ?? null);
      try {
        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("status")
            .eq("user_id", session.user.id)
            .single();
          if (profile?.status === "inactive") {
            await supabase.from("profiles").update({ status: "active" }).eq("user_id", session.user.id);
          }
        }
      } catch {
        // Profile fetch/update is non-blocking; session is still applied
      } finally {
        setLoading(false);
      }
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        void applySession(session ?? null);
      }
    );
    supabase.auth.getSession().then(({ data: { session } }) => {
      void applySession(session ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
