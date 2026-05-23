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
      <aside className="hidden w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/50 backdrop-blur-xl p-6 md:flex sticky top-0 h-screen">
        <div className="mb-10 flex items-center gap-3 px-2">
          <Logo size={22} showWordmark={false} />
          <div className="min-w-0">
            <div className="truncate font-display text-lg font-bold tracking-tight">
              Nex<span className="text-primary">Ponto</span>
            </div>
            <div className="truncate text-[10px] uppercase font-bold tracking-[0.2em] text-primary">
              Admin Console
            </div>
          </div>
        </div>

        <div className="mb-8 p-4 glass-card rounded-2xl">
           <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-full bg-primary/20 border border-primary/20 grid place-items-center text-primary font-bold">
               {profile?.tenant_name?.charAt(0) || "E"}
             </div>
             <div className="min-w-0">
               <div className="truncate text-sm font-semibold">{profile?.tenant_name || "Escritório"}</div>
               <div className="truncate text-[10px] text-muted-foreground uppercase font-medium">Conta Ativa</div>
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
                className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  active
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                }`}
              >
                <item.icon className={`h-4.5 w-4.5 transition-colors ${active ? "text-primary" : "group-hover:text-primary"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4 pt-6 border-t border-border/40">
           <Link 
             to="/admin/configuracoes"
             className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
               loc.pathname.startsWith("/admin/configuracoes")
                 ? "bg-primary/10 text-primary border border-primary/20"
                 : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
             }`}
           >
             <Settings className="h-4.5 w-4.5" /> Configurações
           </Link>
           <button 
             onClick={logout}
             className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-all"
           >
             <LogOut className="h-4.5 w-4.5" /> Sair do Sistema
           </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 border-b border-border/40 flex items-center justify-between px-6 md:px-10 bg-background/20 backdrop-blur-md sticky top-0 z-30">
           <CommandMenu />
            <div className="flex items-center gap-4 ml-auto">
             <div className="h-8 w-[1px] bg-border/50 mx-2"></div>
             <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-semibold leading-tight">{profile?.full_name?.split(" ")[0]}</div>
                  <div className="text-[10px] text-muted-foreground uppercase font-medium">Administrador</div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/10 grid place-items-center font-bold text-primary">
                  {profile?.full_name?.charAt(0) || "A"}
                </div>
             </div>
           </div>
        </header>
        
        <main className="flex-1 p-6 md:p-10 max-w-[1600px] mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
