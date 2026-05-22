import { createFileRoute, Link, Outlet, redirect, useNavigate, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { Clock, History, LogOut, User, Bell } from "lucide-react";
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
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8 animate-fade-in">
      <header className="mb-8 flex items-center justify-between glass-card p-4 rounded-3xl">
        <div className="flex items-center gap-3">
           <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 grid place-items-center font-bold text-primary border border-primary/10">
              {profile?.full_name?.charAt(0) || "U"}
           </div>
           <div className="min-w-0">
             <div className="font-display text-sm font-bold tracking-tight truncate">{profile?.full_name}</div>
             <div className="truncate text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{profile?.tenant_name}</div>
           </div>
        </div>
        <div className="flex items-center gap-2">
           <button className="p-2 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground">
             <Bell className="h-5 w-5" />
           </button>
           <div className="h-8 w-[1px] bg-border/50 mx-1"></div>
           <Button variant="ghost" size="icon" onClick={logout} className="rounded-xl text-destructive/70 hover:text-destructive hover:bg-destructive/10">
             <LogOut className="h-5 w-5" />
           </Button>
        </div>
      </header>

      <nav className="mb-8 flex gap-2 p-1.5 glass-card rounded-2xl border border-border/40">
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

      <main className="flex-1 pb-10">
        <Outlet />
      </main>

      <footer className="py-6 text-center">
         <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse"></div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">Sistema Operacional · NexPonto</span>
         </div>
      </footer>
    </div>
  );
}
