import { createFileRoute, Link, Outlet, redirect, useNavigate, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { Clock, History, LogOut, User, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { memo } from "react";

export const Route = createFileRoute("/_func")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/funcionario/login" });
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    if (!roles?.some((r) => r.role === "employee")) {
      throw redirect({ to: "/funcionario/login" });
    }
  },
  component: memo(FuncLayout),
});

const nav = [
  { to: "/funcionario/meu-ponto", label: "Ponto", icon: Clock },
  { to: "/funcionario/resumo", label: "Resumo", icon: BarChart3 },
  { to: "/funcionario/historico", label: "Histórico", icon: History },
  { to: "/funcionario/perfil", label: "Perfil", icon: User },
] as const;


function FuncLayout() {
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const loc = useLocation();

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div
      className="mx-auto flex max-w-2xl flex-col overflow-hidden animate-fade-in"
      style={{
        height: "100svh",
        minHeight: "100dvh",
        paddingTop: "calc(var(--sat) + 0.75rem)",
        paddingBottom: "calc(var(--sab) + 0.5rem)",
        paddingLeft: "calc(var(--sal) + 1rem)",
        paddingRight: "calc(var(--sar) + 1rem)",
      }}
    >
      <header className="mb-3 flex items-center justify-between gap-3 glass-card p-3 rounded-2xl">
        <div className="flex min-w-0 items-center gap-3">
           <div className="h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 grid place-items-center font-bold text-primary border border-primary/10 overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                profile?.full_name?.charAt(0) || "U"
              )}
           </div>
           <div className="min-w-0">
             <div className="truncate font-display text-sm font-bold tracking-tight">{profile?.full_name}</div>
             <div className="truncate text-[9px] text-muted-foreground uppercase font-bold tracking-widest">{profile?.tenant_name}</div>
           </div>
        </div>
         <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              aria-label="Sair"
              className="h-12 w-12 touch-target rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive active:scale-95 transition-all"
            >
              <LogOut className="h-7 w-7" />
            </Button>
         </div>
      </header>

      <nav className="mb-3 flex gap-2 p-1 glass-card rounded-2xl border border-border/40">
        {nav.map((item) => {
          const active = loc.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[3rem] flex-1 min-w-0 items-center justify-center gap-2 rounded-xl px-2 py-3 text-xs sm:text-sm font-bold transition-all active:scale-[0.97] ${
                active
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <main id="main-content" className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar overscroll-contain">
        <Outlet />
      </main>

      <footer className="pt-2 text-center">
         <div className="flex items-center justify-center gap-2">
            <div className="h-1 w-1 rounded-full bg-success animate-pulse"></div>
            <span className="text-[8px] uppercase font-bold tracking-widest text-muted-foreground/50">NexPonto v1.0</span>
         </div>
      </footer>
    </div>
  );
}

