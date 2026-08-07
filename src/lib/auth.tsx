import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type AuthState = {
  user: User | null;
  loading: boolean;
};

const AuthCtx = createContext<AuthState>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setState({ user: session?.user ?? null, loading: false });
    });
    supabase.auth.getSession().then(({ data }) => {
      setState({ user: data.session?.user ?? null, loading: false });
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return <AuthCtx.Provider value={state}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}

export type ProfileInfo = {
  id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  tenant_name: string;
  tenant_logo_url: string | null;
  role: "admin" | "employee" | null;
};

/** Converts a stored avatar value (path or legacy public URL) into a storage path. */
export function toAvatarPath(value: string | null): string | null {
  if (!value) return null;
  const marker = "/storage/v1/object/public/avatars/";
  const i = value.indexOf(marker);
  if (i !== -1) return value.slice(i + marker.length).split("?")[0];
  if (value.startsWith("http")) return null;
  return value;
}

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    staleTime: 1000 * 60 * 30, // 30 minutes (profile info is very stable)
    enabled: !!user,
    queryFn: async (): Promise<ProfileInfo | null> => {
      if (!user) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, tenant_id, full_name, email, avatar_url, tenants(name, logo_url)")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile) return null;
      // Avatars live in a private bucket — resolve a short-lived signed URL.
      let avatarUrl: string | null = null;
      const avatarPath = toAvatarPath((profile as any).avatar_url ?? null);
      if (avatarPath) {
        const { data: signed } = await supabase.storage
          .from("avatars")
          .createSignedUrl(avatarPath, 60 * 60);
        avatarUrl = signed?.signedUrl ?? null;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const role =
        roles?.find((r) => r.role === "admin")?.role ??
        roles?.find((r) => r.role === "employee")?.role ??
        null;
      return {
        id: profile.id,
        tenant_id: profile.tenant_id,
        full_name: profile.full_name,
        email: profile.email,
        avatar_url: avatarUrl,
        tenant_name: (profile as any).tenants?.name ?? "",
        tenant_logo_url: (profile as any).tenants?.logo_url ?? null,
        role: role as "admin" | "employee" | null,
      };
    },
  });
}

