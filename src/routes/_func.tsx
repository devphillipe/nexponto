import { createFileRoute, Link, Outlet, redirect, useNavigate, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { Clock, History, LogOut, User, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { memo, useEffect } from "react";
import { EmployeeMembershipProvider, clearStoredEmployeeTenant, useEmployeeMembership } from "@/lib/employee-membership";

export const Route = createFileRoute("/_func")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/funcionario/login" });

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "employee");

    if (!roles?.length) {
      throw redirect({ to: "/funcionario/login" });
    }
  },
  component: memo(FuncLayoutWithMembership),
});

const nav = [
  { to: "/funcionario/meu-ponto", label: "Ponto", icon: Clock },
  { to: "/funcionario/resumo", label: "Resumo", icon: BarChart3 },
  { to: "/funcionario/historico", label: "Histórico", icon: History },
  { to: "/funcionario/perfil", label: "Perfil", icon: User },
] as const;

function FuncLayoutWithMembership() {
  return (
    <EmployeeMembershipProvider>
      <FuncLayout />
    </EmployeeMembershipProvider>
  );
}

function FuncLayout() {
  const { data: profile } = useProfile();
  const { memberships, selected, loading: membershipLoading, clearSelection } = useEmployeeMembership();
  const navigate = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (membershipLoading) return;
    const onSelector = loc.pathname.startsWith("/funcionario/selecionar-empresa");
    if (memberships.length > 1 && !selected && !onSelector) {
      navigate({ to: "/funcionario/selecionar-empresa" });
    }
  }, [membershipLoading, memberships.length, selected, loc.pathname, navigate]);

  async function logout() {
    clearSelection();
    clearStoredEmployeeTenant();
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-dvh bg-background [padding-top:var(--sat)] [padding-bottom:var(--sab)]">
      <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-white/95 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <Logo size={24} wordmarkClassName="text-lg" />
            <div className="flex min-w-0 items-center gap-3">
              <div className="hidden min-w-0 text-right sm:block">
                <div className="truncate text-xs font-bold text-[#071A2B]">{profile?.full_name}</div>
                {memberships.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/funcionario/selecionar-empresa" })}
                    className="max-w-48 truncate text-[10px] font-bold text-primary hover:underline"
                    title="Trocar escritório"
                  >
                    {selected?.tenant_name ?? "Selecionar escritório"}
                  </button>
                ) : (
                  <div className="truncate text-[10px] font-medium text-muted-foreground">
                    {selected?.tenant_name ?? profile?.tenant_name}
                  </div>
                )}
              </div>
              <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-blue-50 text-sm font-extrabold text-primary">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  profile?.full_name?.charAt(0) || "U"
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                aria-label="Sair"
                className="text-muted-foreground hover:bg-red-50 hover:text-destructive"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1 px-4 py-5 pb-24">
          <Outlet />
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 backdrop-blur-xl [padding-bottom:var(--sab)]">
          <div className="mx-auto grid max-w-2xl grid-cols-4 px-2 py-2">
            {nav.map((item) => {
              const active = loc.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={
                    "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[10px] font-bold transition-colors " +
                    (active
                      ? "bg-blue-50 text-primary"
                      : "text-muted-foreground hover:bg-slate-50 hover:text-foreground")
                  }
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
