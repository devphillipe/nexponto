import { createFileRoute, Link, Outlet, redirect, useNavigate, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { LayoutDashboard, Users, Clock, LogOut, Bell, Search, Settings, FileText, Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { CommandMenu } from "@/components/CommandMenu";
import { memo, useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen bg-background/50 overflow-x-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border/40 bg-background/40 backdrop-blur-2xl p-8 lg:flex sticky top-0 h-dvh safe-top safe-bottom transition-all duration-300">
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
                className={`group flex items-center gap-3 rounded-2xl px-5 py-3.5 min-h-[3rem] text-sm font-semibold transition-all duration-300 ${
                  active
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02] border border-primary/20"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:translate-x-1"
                }`}
              >
                <item.icon className={`h-5 w-5 transition-colors duration-300 ${active ? "text-primary-foreground" : "group-hover:text-primary"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4 pt-6 border-t border-border/40">
           <Link 
             to="/admin/configuracoes"
             className={`flex w-full items-center gap-3 rounded-2xl px-5 py-3.5 min-h-[3rem] text-sm font-semibold transition-all duration-300 ${
               loc.pathname.startsWith("/admin/configuracoes")
                 ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                 : "text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:translate-x-1"
             }`}
           >
             <Settings className="h-5 w-5" /> Configurações
           </Link>
           <button 
             onClick={logout}
             className="flex w-full items-center gap-3 rounded-2xl px-5 py-3.5 min-h-[3rem] text-sm font-semibold text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-all duration-300 hover:translate-x-1"
           >
             <LogOut className="h-5 w-5" /> Sair do Sistema
           </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 max-w-full">
        <header className="h-20 md:h-24 border-b border-border/40 flex items-center justify-between px-4 md:px-8 lg:px-12 bg-background/60 backdrop-blur-2xl sticky top-0 z-30 transition-all duration-300 safe-top safe-x box-content">
           <div className="flex items-center gap-4 lg:hidden">
             <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
               <SheetTrigger asChild>
                 <Button variant="ghost" size="icon" className="h-10 w-10">
                   <Menu className="h-6 w-6" />
                 </Button>
               </SheetTrigger>
               <SheetContent side="left" className="p-0 w-[85vw] max-w-xs border-r border-border/40 bg-background/95 backdrop-blur-2xl">
                 <div className="flex h-full flex-col p-6 [padding-top:calc(1.5rem+var(--sat))] [padding-bottom:calc(1.5rem+var(--sab))] [padding-left:calc(1.5rem+var(--sal))]">
                    <SheetHeader className="mb-10 text-left px-2">
                      <div className="flex items-center gap-3">
                        <Logo size={24} showWordmark={false} />
                        <SheetTitle className="text-xl font-bold tracking-tight">NexPonto</SheetTitle>
                      </div>
                    </SheetHeader>

                    <nav className="flex flex-1 flex-col gap-2">
                      {nav.map((item) => {
                        const active = loc.pathname.startsWith(item.to);
                        return (
                          <Link
                            key={item.to}
                            to={item.to}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`group flex items-center gap-3 rounded-2xl px-5 py-3.5 min-h-[3rem] text-sm font-semibold transition-all duration-300 ${
                              active
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02] border border-primary/20"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            }`}
                          >
                            <item.icon className={`h-5 w-5 transition-colors duration-300 ${active ? "text-primary-foreground" : "group-hover:text-primary"}`} />
                            {item.label}
                          </Link>
                        );
                      })}
                    </nav>

                    <div className="mt-auto space-y-4 pt-6 border-t border-border/40">
                      <Link 
                        to="/admin/configuracoes"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex w-full items-center gap-3 rounded-2xl px-5 py-3.5 min-h-[3rem] text-sm font-semibold transition-all duration-300 ${
                          loc.pathname.startsWith("/admin/configuracoes")
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        }`}
                      >
                        <Settings className="h-5 w-5" /> Configurações
                      </Link>
                      <button 
                        onClick={() => { setIsMobileMenuOpen(false); logout(); }}
                        className="flex w-full items-center gap-3 rounded-2xl px-5 py-3.5 min-h-[3rem] text-sm font-semibold text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-all duration-300"
                      >
                        <LogOut className="h-5 w-5" /> Sair
                      </button>
                    </div>
                 </div>
               </SheetContent>
             </Sheet>
             <div className="md:hidden">
                <Logo size={20} showWordmark={false} />
             </div>
           </div>

           <div className="hidden md:block flex-1 max-w-xl">
             <CommandMenu />
           </div>
           
            <div className="flex items-center gap-2 md:gap-6 ml-auto">
              <div className="md:hidden">
                 <CommandMenu />
              </div>
              <div className="h-8 w-[1px] bg-border mx-1 md:mx-2 hidden sm:block"></div>
              <div className="flex items-center gap-2 md:gap-4">
                <div className="text-right hidden sm:block">
                  <div className="text-xs md:text-sm font-bold text-foreground leading-none mb-1">{profile?.full_name?.split(' ')[0]}</div>
                  <div className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-primary/70">Admin</div>
                </div>
                <div className="h-9 w-9 md:h-11 md:w-11 rounded-xl md:rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center font-bold text-primary shadow-sm text-xs md:text-base">
                  {profile?.full_name?.charAt(0)}
                </div>
              </div>
            </div>
        </header>
        
        <main id="main-content" className="flex-1 p-4 md:p-8 lg:p-12 max-w-[1600px] mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700 overflow-x-hidden safe-bottom safe-x">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
