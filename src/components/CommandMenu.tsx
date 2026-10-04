import React, { useState, useEffect } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useNavigate } from "@tanstack/react-router";
import { 
  Users, 
  Clock, 
  LayoutDashboard, 
  Settings, 
  FileText,
  Search,
  Plus,
  UserPlus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const fetchEmployees = async () => {
    if (!profile?.tenant_id) return;
    const { data } = await supabase
      .from("employees")
      .select("id, full_name")
      .eq("tenant_id", profile.tenant_id)
      .limit(5);
    if (data) setEmployees(data);
  };

  useEffect(() => {
    if (open) {
      fetchEmployees();
    }
  }, [open, profile?.tenant_id]);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(window.navigator.platform);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex items-center gap-3 rounded-xl bg-slate-50 border border-border px-3 md:px-5 py-2 md:py-3 text-xs md:text-sm text-muted-foreground transition-all duration-200 hover:bg-white hover:border-slate-300 hover:shadow-sm group w-10 h-10 md:w-full md:max-w-lg md:h-auto"
      >
        <Search className="h-5 w-5 group-hover:text-primary transition-colors shrink-0" />
        <span className="font-medium truncate hidden md:inline-block">O que você deseja fazer?</span>
        <kbd className="pointer-events-none absolute right-4 hidden h-6 select-none items-center gap-1 rounded-lg border border-border/60 bg-white px-2 font-mono text-[10px] font-bold opacity-100 sm:flex">
          <span className="text-xs">{isMac ? '⌘' : 'Ctrl'}</span> K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Digite um comando ou pesquise..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          <CommandGroup heading="Sugestões">
            <CommandItem onSelect={() => runCommand(() => navigate({ to: "/admin/dashboard" }))}>
              <LayoutDashboard className="mr-2 h-5 w-5" />
              <span>Dashboard</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate({ to: "/admin/funcionarios" }))}>
              <Users className="mr-2 h-5 w-5" />
              <span>Funcionários</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate({ to: "/admin/pontos" }))}>
              <Clock className="mr-2 h-5 w-5" />
              <span>Controle de Pontos</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate({ to: "/admin/relatorios" }))}>
              <FileText className="mr-2 h-5 w-5" />
              <span>Relatórios</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Ações Rápidas">
            <CommandItem onSelect={() => runCommand(() => navigate({ to: "/admin/funcionarios" }))}>
              <UserPlus className="mr-2 h-5 w-5" />
              <span>Cadastrar Funcionário</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate({ to: "/admin/abonos" }))}>
              <Plus className="mr-2 h-5 w-5" />
              <span>Lançar Abono</span>
            </CommandItem>
          </CommandGroup>
          {employees.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Funcionários Recentes">
                {employees.map((emp) => (
                  <CommandItem
                    key={emp.id}
                    onSelect={() => runCommand(() => navigate({ to: `/admin/pontos`, search: { employee: emp.id } } as any))}
                  >
                    <Users className="mr-2 h-5 w-5" />
                    <span>{emp.full_name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
          <CommandSeparator />
          <CommandGroup heading="Configurações">
            <CommandItem onSelect={() => runCommand(() => navigate({ to: "/admin/configuracoes" }))}>
              <Settings className="mr-2 h-5 w-5" />
              <span>Configurações do Escritório</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
