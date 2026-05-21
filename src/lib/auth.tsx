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
  tenant_name: string;
  role: "admin" | "employee" | null;
};

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ProfileInfo | null> => {
      if (!user) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, tenant_id, full_name, email, tenants(name)")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile) return null;
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
        tenant_name: (profile as any).tenants?.name ?? "",
        role: role as "admin" | "employee" | null,
      };
    },
  });
}
