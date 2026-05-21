import { createFileRoute, Link, Outlet, redirect, useNavigate, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { Clock, History, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  component: FuncLayout,
});

const nav = [
  { to: "/funcionario/meu-ponto", label: "Meu Ponto", icon: Clock },
  { to: "/funcionario/historico", label: "Histórico", icon: History },
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
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div className="min-w-0">
          <div className="font-display text-base font-semibold">{profile?.tenant_name}</div>
          <div className="truncate text-xs text-muted-foreground">{profile?.full_name}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </Button>
      </header>

      <nav className="mb-6 flex gap-1 rounded-lg border border-border bg-card/40 p-1">
        {nav.map((item) => {
          const active = loc.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
