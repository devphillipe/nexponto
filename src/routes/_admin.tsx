import { createFileRoute, Link, Outlet, redirect, useNavigate, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { LayoutDashboard, Users, Clock, LogOut, Bell, Search, Settings, FileText } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { CommandMenu } from "@/components/CommandMenu";
import { memo } from "react";

export const Route = createFileRoute("/_admin")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/admin/login" });
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    if (!roles?.some((r) => r.role === "admin")) {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: memo(AdminLayout),
});

const nav = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/funcionarios", label: "Funcionários", icon: Users },
  { to: "/admin/pontos", label: "Pontos", icon: Clock },
  { to: "/admin/abonos", label: "Abonos", icon: FileText },
  { to: "/admin/relatorios", label: "Relatórios", icon: FileText },
] as const;

function AdminLayout() {
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const loc = useLocation();

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen bg-background/50">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border/40 bg-background/40 backdrop-blur-2xl p-8 md:flex sticky top-0 h-screen transition-all duration-300">
        <div className="mb-10 flex items-center gap-3 px-1">
          <Logo size={24} showWordmark={false} />
          <div className="min-w-0">
            <div className="truncate font-display text-xl font-bold tracking-tight">
              Nex<span className="text-primary">Ponto</span>
            </div>
            <div className="truncate text-[9px] uppercase font-black tracking-[0.25em] text-primary/80 opacity-80">
              Admin Console
            </div>
          </div>
        </div>

        <div className="mb-8 p-5 glass-card rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border-primary/10 shadow-sm transition-all hover:shadow-md">
           <div className="flex items-center gap-3">
             <div className="min-w-0">
               <div className="truncate text-[9px] text-primary uppercase font-black tracking-widest mb-0.5">Assinatura Ativa</div>
               <div className="truncate text-xs font-bold text-foreground">Escritório Central</div>
             </div>
           </div>
        </div>

        <nav className="flex flex-1 flex-col gap-2">
          <div className="px-2 mb-2 text-[10px] uppercase font-bold tracking-widest text-muted-foreground/50">
            Principal
          </div>
          {nav.map((item) => {
            const active = loc.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all duration-300 ${
                  active
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02] border border-primary/20"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:translate-x-1"
                }`}
              >
                <item.icon className={`h-4.5 w-4.5 transition-colors duration-300 ${active ? "text-primary-foreground" : "group-hover:text-primary"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4 pt-6 border-t border-border/40">
           <Link 
             to="/admin/configuracoes"
             className={`flex w-full items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all duration-300 ${
               loc.pathname.startsWith("/admin/configuracoes")
                 ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                 : "text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:translate-x-1"
             }`}
           >
             <Settings className="h-4.5 w-4.5" /> Configurações
           </Link>
           <button 
             onClick={logout}
             className="flex w-full items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-semibold text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-all duration-300 hover:translate-x-1"
           >
             <LogOut className="h-4.5 w-4.5" /> Sair do Sistema
           </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-24 border-b border-border/40 flex items-center justify-between px-8 md:px-12 bg-background/60 backdrop-blur-2xl sticky top-0 z-30 transition-all duration-300">
           <CommandMenu />
            <div className="flex items-center gap-6 ml-auto">
              <div className="h-10 w-[1px] bg-border/40 mx-2"></div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-bold text-foreground leading-none mb-1">{profile?.full_name}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-primary/70">Administrador</div>
                </div>
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center font-bold text-primary shadow-sm">
                  {profile?.full_name?.charAt(0)}
                </div>
              </div>
            </div>
        </header>
        
        <main className="flex-1 p-8 md:p-12 max-w-[1600px] mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
