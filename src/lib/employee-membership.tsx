import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const STORAGE_KEY = "nexponto-employee-tenant";

export type EmployeeMembership = {
  id: string;
  tenant_id: string;
  active: boolean;
  daily_hours: number | null;
  work_days: number[];
  hire_date: string | null;
  tenant_name: string;
  tenant_timezone: string;
  tenant_default_daily_hours: number;
};

type EmployeeMembershipContextValue = {
  memberships: EmployeeMembership[];
  selected: EmployeeMembership | null;
  loading: boolean;
  selectTenant: (tenantId: string) => void;
  clearSelection: () => void;
};

const EmployeeMembershipContext = createContext<EmployeeMembershipContextValue>({
  memberships: [],
  selected: null,
  loading: true,
  selectTenant: () => {},
  clearSelection: () => {},
});

function readStoredTenant() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function EmployeeMembershipProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(() => readStoredTenant());

  const { data, isLoading } = useQuery({
    queryKey: ["employee-memberships", user?.id],
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, tenant_id, active, daily_hours, work_days, hire_date, tenants(name, timezone, default_daily_hours)")
        .eq("user_id", user!.id)
        .eq("active", true)
        .order("created_at", { ascending: true });
      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        id: row.id,
        tenant_id: row.tenant_id,
        active: row.active,
        daily_hours: row.daily_hours,
        work_days: row.work_days ?? [1, 2, 3, 4, 5],
        hire_date: row.hire_date,
        tenant_name: row.tenants?.name ?? "Escritório",
        tenant_timezone: row.tenants?.timezone ?? "America/Sao_Paulo",
        tenant_default_daily_hours: row.tenants?.default_daily_hours ?? 8,
      })) as EmployeeMembership[];
    },
  });

  const memberships = data ?? [];

  useEffect(() => {
    if (isLoading) return;

    if (memberships.length === 1) {
      const only = memberships[0]!;
      if (selectedTenantId !== only.tenant_id) {
        setSelectedTenantId(only.tenant_id);
        window.localStorage.setItem(STORAGE_KEY, only.tenant_id);
      }
      return;
    }

    if (selectedTenantId && !memberships.some((m) => m.tenant_id === selectedTenantId)) {
      setSelectedTenantId(null);
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [isLoading, memberships, selectedTenantId]);

  const selected = useMemo(
    () => memberships.find((m) => m.tenant_id === selectedTenantId) ?? null,
    [memberships, selectedTenantId],
  );

  const value = useMemo<EmployeeMembershipContextValue>(
    () => ({
      memberships,
      selected,
      loading: isLoading,
      selectTenant: (tenantId) => {
        if (!memberships.some((m) => m.tenant_id === tenantId)) return;
        setSelectedTenantId(tenantId);
        window.localStorage.setItem(STORAGE_KEY, tenantId);
      },
      clearSelection: () => {
        setSelectedTenantId(null);
        if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
      },
    }),
    [memberships, selected, isLoading],
  );

  return (
    <EmployeeMembershipContext.Provider value={value}>
      {children}
    </EmployeeMembershipContext.Provider>
  );
}

export function useEmployeeMembership() {
  return useContext(EmployeeMembershipContext);
}

export function clearStoredEmployeeTenant() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}
