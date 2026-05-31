"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export interface UserProfile {
  userId: string;
  username: string;
  bio: string;
  letterboxd: string;
  twitter: string;
  instagram: string;
  avatarUrl: string | null;
  role: string;
  usernameFontSlug: string | null;
  usernameColorSlug: string | null;
  profileAccentSlug: string | null;
  chatBannedUntil: string | null;
  chatBanReason: string | null;
}

interface AuthState {
  user: User | null;
  username: string | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<string | null>;
  updateEmail: (email: string) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
  updateProfile: (
    patch: Partial<
      Pick<
        UserProfile,
        | "bio"
        | "letterboxd"
        | "twitter"
        | "instagram"
        | "avatarUrl"
        | "usernameFontSlug"
        | "usernameColorSlug"
        | "profileAccentSlug"
      >
    >
  ) => Promise<string | null>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  username: null,
  profile: null,
  loading: true,
  signUp: async () => null,
  signIn: async () => null,
  signOut: async () => {},
  resetPassword: async () => null,
  updateEmail: async () => null,
  updatePassword: async () => null,
  updateProfile: async () => null,
});

interface ProfileRow {
  user_id: string;
  username: string;
  bio: string;
  letterboxd: string;
  twitter: string | null;
  instagram: string | null;
  avatar_url: string | null;
  role: string;
  username_font_slug: string | null;
  username_color_slug: string | null;
  profile_accent_slug: string | null;
  chat_banned_until: string | null;
  chat_ban_reason: string | null;
}

function rowToProfile(row: ProfileRow): UserProfile {
  return {
    userId: row.user_id,
    username: row.username,
    bio: row.bio ?? "",
    letterboxd: row.letterboxd ?? "",
    twitter: row.twitter ?? "",
    instagram: row.instagram ?? "",
    avatarUrl: row.avatar_url,
    role: row.role ?? "spectateur",
    usernameFontSlug: row.username_font_slug,
    usernameColorSlug: row.username_color_slug,
    profileAccentSlug: row.profile_accent_slug,
    chatBannedUntil: row.chat_banned_until,
    chatBanReason: row.chat_ban_reason,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "user_id,username,bio,letterboxd,twitter,instagram,avatar_url,role,username_font_slug,username_color_slug,profile_accent_slug,chat_banned_until,chat_ban_reason"
      )
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) {
      setProfile(null);
      return;
    }
    setProfile(rowToProfile(data as ProfileRow));
  }, []);

  useEffect(() => {
    let cancelled = false;

    let hasStoredSession = false;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) {
          hasStoredSession = true;
          break;
        }
      }
    } catch {}

    const init = async () => {
      if (!hasStoredSession) {
        setLoading(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      const u = session?.user ?? null;
      setUser(u);
      if (u) await fetchProfile(u.id);
      if (!cancelled) setLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        void fetchProfile(u.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`my-profile:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void fetchProfile(user.id);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchProfile]);

  const username = profile?.username ?? user?.user_metadata?.username ?? null;

  const updateProfile: AuthState["updateProfile"] = async (patch) => {
    if (!user) return "non connecté";

    const dbPatch: Record<string, unknown> = {};
    if (patch.bio !== undefined) dbPatch.bio = patch.bio;
    if (patch.letterboxd !== undefined) dbPatch.letterboxd = patch.letterboxd;
    if (patch.twitter !== undefined) dbPatch.twitter = patch.twitter;
    if (patch.instagram !== undefined) dbPatch.instagram = patch.instagram;
    if (patch.avatarUrl !== undefined) dbPatch.avatar_url = patch.avatarUrl;
    if (patch.usernameFontSlug !== undefined) dbPatch.username_font_slug = patch.usernameFontSlug;
    if (patch.usernameColorSlug !== undefined) dbPatch.username_color_slug = patch.usernameColorSlug;
    if (patch.profileAccentSlug !== undefined) dbPatch.profile_accent_slug = patch.profileAccentSlug;

    const { data, error } = await supabase
      .from("profiles")
      .update(dbPatch)
      .eq("user_id", user.id)
      .select(
        "user_id,username,bio,letterboxd,twitter,instagram,avatar_url,role,username_font_slug,username_color_slug,profile_accent_slug,chat_banned_until,chat_ban_reason"
      );

    if (error) {
      console.error("[updateProfile] supabase error:", error);
      return error.message;
    }

    const rows = (data ?? []) as ProfileRow[];
    if (rows.length === 0) {
      const fallbackUsername =
        profile?.username ??
        (user.user_metadata?.username as string | undefined) ??
        `spectateur_${user.id.slice(0, 8)}`;
      const { data: upData, error: upErr } = await supabase
        .from("profiles")
        .upsert(
          {
            user_id: user.id,
            username: fallbackUsername,
            bio: patch.bio ?? "",
            letterboxd: patch.letterboxd ?? "",
            twitter: patch.twitter ?? "",
            instagram: patch.instagram ?? "",
            avatar_url: patch.avatarUrl ?? null,
            username_font_slug: patch.usernameFontSlug ?? null,
            username_color_slug: patch.usernameColorSlug ?? null,
            profile_accent_slug: patch.profileAccentSlug ?? null,
          },
          { onConflict: "user_id" }
        )
        .select(
          "user_id,username,bio,letterboxd,twitter,instagram,avatar_url,role,username_font_slug,username_color_slug,profile_accent_slug,chat_banned_until,chat_ban_reason"
        )
        .single();
      if (upErr) {
        console.error("[updateProfile] upsert fallback error:", upErr);
        return upErr.message;
      }
      if (upData) setProfile(rowToProfile(upData as ProfileRow));
      return null;
    }

    setProfile(rowToProfile(rows[0]));
    return null;
  };

  const signUp = async (email: string, password: string, usernameInput: string): Promise<string | null> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: usernameInput } },
    });
    if (error) return error.message;
    return null;
  };

  const signIn = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    return null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string): Promise<string | null> => {
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/recovery` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) return error.message;
    return null;
  };

  const updateEmail = async (email: string): Promise<string | null> => {
    const emailRedirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/compte` : undefined;
    const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo });
    if (error) return error.message;
    return null;
  };

  const updatePassword = async (password: string): Promise<string | null> => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return error.message;
    return null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        username,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updateEmail,
        updatePassword,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
