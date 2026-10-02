import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient.js";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      setIsAdmin(false);
      return;
    }
    const [profileResult, adminResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      // is_admin() is a SECURITY DEFINER function — safe to call as any
      // authenticated user, it only ever reveals whether *you* are an
      // admin, never the admins table itself.
      supabase.rpc("is_admin"),
    ]);

    if (profileResult.error) {
      // eslint-disable-next-line no-console
      console.error("[Beeyond Vault] Failed to load profile:", profileResult.error.message);
      setProfile(null);
    } else {
      setProfile(profileResult.data);
    }

    if (adminResult.error) {
      // eslint-disable-next-line no-console
      console.error("[Beeyond Vault] Failed to check admin status:", adminResult.error.message);
      setIsAdmin(false);
    } else {
      setIsAdmin(Boolean(adminResult.data));
    }
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!active) return;
      setSession(initialSession);
      loadProfile(initialSession?.user?.id).finally(() => {
        if (active) setLoading(false);
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      loadProfile(newSession?.user?.id);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
  }, []);

  const refreshProfile = useCallback(
    () => loadProfile(session?.user?.id),
    [loadProfile, session],
  );

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    isAdmin,
    loading,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
