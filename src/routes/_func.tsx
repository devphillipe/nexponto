import { createFileRoute, Link, Outlet, redirect, useNavigate, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { Clock, History, LogOut, User } from "lucide-react";
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
  { to: "/funcionario/meu-ponto", label: "Registrar Ponto", icon: Clock },
  { to: "/funcionario/historico", label: "Meu Histórico", icon: History },
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
    <div className="mx-auto flex h-screen max-w-2xl flex-col px-4 py-4 animate-fade-in overflow-hidden">
      <header className="mb-4 flex items-center justify-between glass-card p-3 rounded-2xl">
        <div className="flex items-center gap-3">
           <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 grid place-items-center font-bold text-primary border border-primary/10 overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                profile?.full_name?.charAt(0) || "U"
              )}
           </div>
           <div className="min-w-0">
             <div className="font-display text-xs font-bold tracking-tight truncate">{profile?.full_name}</div>
             <div className="truncate text-[9px] text-muted-foreground uppercase font-bold tracking-widest">{profile?.tenant_name}</div>
           </div>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="icon" onClick={logout} className="h-9 w-9 rounded-xl text-destructive/70 hover:text-destructive hover:bg-destructive/10">
             <LogOut className="h-4.5 w-4.5" />
           </Button>
        </div>
      </header>

      <nav className="mb-4 flex gap-2 p-1 glass-card rounded-xl border border-border/40">
        {nav.map((item) => {
          const active = loc.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-1 items-center justify-center gap-2.5 rounded-xl px-4 py-3.5 text-sm font-bold transition-all ${
                active
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)] scale-[1.02]"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 overflow-y-auto no-scrollbar">
        <Outlet />
      </main>

      <footer className="py-2 text-center">
         <div className="flex items-center justify-center gap-2">
            <div className="h-1 w-1 rounded-full bg-success animate-pulse"></div>
            <span className="text-[8px] uppercase font-bold tracking-widest text-muted-foreground/50">NexPonto v1.0</span>
         </div>
      </footer>
    </div>
  );
}
