import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, Mail, Phone, MapPin, Clock, Globe } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_admin/admin/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — NexPonto Admin" }] }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    document: "",
    email: "",
    phone: "",
    address: "",
    timezone: "America/Sao_Paulo",
    default_daily_hours: 8,
  });

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant", profile?.tenant_id],
    enabled: !!profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", profile!.tenant_id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || "",
        document: tenant.document || "",
        email: tenant.email || "",
        phone: tenant.phone || "",
        address: (tenant as any).address || "",
        timezone: (tenant as any).timezone || "America/Sao_Paulo",
        default_daily_hours: tenant.default_daily_hours || 8,
      });
    }
  }, [tenant]);

  const updateMutation = useMutation({
    mutationFn: async (newData: typeof formData) => {
      const { error } = await supabase
        .from("tenants")
        .update({
          name: newData.name,
          document: newData.document,
          email: newData.email,
          phone: newData.phone,
          address: newData.address,
          timezone: newData.timezone,
          default_daily_hours: newData.default_daily_hours,
        } as any)
        .eq("id", profile!.tenant_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Configurações atualizadas com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar configurações: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) return <div className="p-10 text-center">Carregando configurações...</div>;

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">Configurações da Empresa</h1>
        <p className="text-muted-foreground mt-2 text-lg">Gerencie as informações e preferências do seu escritório.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="glass-card border-none shadow-xl rounded-[2rem] overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-xl flex items-center gap-2 text-primary">
              <Building2 className="h-5 w-5" />
              Informações Gerais
            </CardTitle>
            <CardDescription>Dados básicos de identificação da sua empresa.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Empresa</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="document">CNPJ / CPF</Label>
              <Input 
                id="document" 
                value={formData.document} 
                onChange={e => setFormData(prev => ({ ...prev, document: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail de Contato</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email"
                  value={formData.email} 
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="phone" 
                  value={formData.phone} 
                  onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Endereço Completo</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="address" 
                  value={formData.address} 
                  onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-none shadow-xl rounded-[2rem] overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-xl flex items-center gap-2 text-primary">
              <Clock className="h-5 w-5" />
              Preferências de Sistema
            </CardTitle>
            <CardDescription>Configure horários padrão e fuso horário.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="timezone">Fuso Horário</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="timezone" 
                  value={formData.timezone} 
                  onChange={e => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="default_hours">Carga Horária Padrão (Horas/Dia)</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="default_hours" 
                  type="number"
                  value={formData.default_daily_hours} 
                  onChange={e => setFormData(prev => ({ ...prev, default_daily_hours: parseInt(e.target.value) }))}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="submit" size="lg" disabled={updateMutation.isPending} className="rounded-xl px-12 py-6 text-lg font-bold">
            {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </div>
  );
}
