import { createFileRoute, Link, Outlet, redirect, useNavigate, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import {
  LayoutDashboard,
  Users,
  Clock,
  LogOut,
  Settings,
  FileText,
  Menu,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { CommandMenu } from "@/components/CommandMenu";
import { memo, useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/_admin")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/admin/login" });

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
  { to: "/admin/assinatura", label: "Assinatura", icon: CreditCard },
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

  const navigation = (
    <>
      <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
        Principal
      </div>
      <nav className="flex flex-col gap-1.5">
        {nav.map((item) => {
          const active = loc.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setIsMobileMenuOpen(false)}
              className={
                "group flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors " +
                (active
                  ? "bg-white/10 text-white"
                  : "text-slate-300 hover:bg-white/[0.06] hover:text-white")
              }
            >
              <item.icon className={"h-5 w-5 " + (active ? "text-cyan-300" : "text-slate-400 group-hover:text-blue-300")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-[#071A2B] px-4 py-6 text-white lg:flex">
        <div className="px-2">
          <Logo size={28} inverse wordmarkClassName="text-xl" />
          <p className="mt-2 pl-10 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Gestão de jornada
          </p>
        </div>

        <div className="mt-8 flex-1">{navigation}</div>

        <div className="border-t border-white/10 pt-4">
          <Link
            to="/admin/configuracoes"
            className={
              "flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors " +
              (loc.pathname.startsWith("/admin/configuracoes")
                ? "bg-white/10 text-white"
                : "text-slate-300 hover:bg-white/[0.06] hover:text-white")
            }
          >
            <Settings className="h-5 w-5" />
            Configurações
          </Link>
          <button
            onClick={logout}
            className="mt-1.5 flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur-xl [padding-top:var(--sat)]">
          <div className="flex h-18 items-center gap-3 px-4 md:px-6 lg:px-8">
            <div className="lg:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Abrir menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[86vw] max-w-xs border-r-0 bg-[#071A2B] p-0 text-white">
                  <div className="flex h-full flex-col px-4 py-6 [padding-top:calc(1.5rem+var(--sat))]">
                    <SheetHeader className="px-2 text-left">
                      <SheetTitle className="sr-only">Menu do NexPonto</SheetTitle>
                      <Logo size={28} inverse wordmarkClassName="text-xl" />
                    </SheetHeader>
                    <div className="mt-8 flex-1">{navigation}</div>
                    <button
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        logout();
                      }}
                      className="flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-red-500/10 hover:text-red-300"
                    >
                      <LogOut className="h-5 w-5" />
                      Sair
                    </button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="hidden flex-1 md:block">
              <CommandMenu />
            </div>

            <div className="md:hidden">
              <Logo size={24} showWordmark={false} />
            </div>

            <div className="ml-auto flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-lg border border-border bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 xl:flex">
                <ShieldCheck className="h-4 w-4 text-success" />
                Ambiente protegido
              </div>

              <div className="hidden text-right sm:block">
                <div className="max-w-48 truncate text-xs font-bold text-[#071A2B]">{profile?.tenant_name}</div>
                <div className="max-w-48 truncate text-[11px] font-medium text-muted-foreground">{profile?.full_name}</div>
              </div>

              {profile?.tenant_logo_url ? (
                <img
                  src={profile.tenant_logo_url}
                  alt={`Logo ${profile.tenant_name ?? "do escritório"}`}
                  className="h-10 w-10 rounded-xl border border-border bg-white object-contain p-1 shadow-sm"
                />
              ) : (
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-sm font-extrabold text-primary">
                  {profile?.tenant_name?.charAt(0) ?? profile?.full_name?.charAt(0) ?? "N"}
                </div>
              )}
            </div>
          </div>
        </header>

        <main
          id="main-content"
          className="mx-auto w-full max-w-[1600px] flex-1 overflow-x-hidden p-4 [padding-bottom:calc(1rem+var(--sab))] md:p-6 md:[padding-bottom:calc(1.5rem+var(--sab))] lg:p-8 lg:[padding-bottom:calc(2rem+var(--sab))]"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
