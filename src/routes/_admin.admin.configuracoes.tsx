import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, Mail, Phone, MapPin, Clock, Globe, Upload, Loader2, Image as ImageIcon, Search as SearchIcon, Lock } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { CpfCnpjInput, PhoneInput, CepInput } from "@/components/forms/SpecializedInputs";
import { PasswordInput } from "@/components/forms/PasswordInput";
import { PasswordStrengthMeter } from "@/components/forms/PasswordStrengthMeter";
import { getPasswordStrength } from "@/lib/validators";
import { translateAuthError } from "@/lib/auth-errors";
import { onlyDigits, formatCep } from "@/lib/masks";

export const Route = createFileRoute("/_admin/admin/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — NexPonto Admin" }] }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [cep, setCep] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    document: "",
    email: "",
    phone: "",
    address: "",
    timezone: "America/Sao_Paulo",
    default_daily_hours: 8,
    logo_url: "",
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
        logo_url: tenant.logo_url || "",
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.tenant_id) return;

    const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
    if (!allowedTypes.has(file.type)) {
      toast.error("Use uma imagem PNG, JPG ou WebP.");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A logo deve ter no máximo 5 MB.");
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${profile.tenant_id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("logos")
        .getPublicUrl(filePath);

      await supabase
        .from("tenants")
        .update({ logo_url: publicUrl } as any)
        .eq("id", profile.tenant_id);

      setFormData(prev => ({ ...prev, logo_url: publicUrl }));
      queryClient.invalidateQueries({ queryKey: ["tenant"] });
      toast.success("Logo atualizada com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao fazer upload: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Informe o nome da empresa.");
      return;
    }

    if (!Number.isFinite(formData.default_daily_hours) || formData.default_daily_hours < 1 || formData.default_daily_hours > 24) {
      toast.error("A carga horária padrão deve estar entre 1 e 24 horas.");
      return;
    }

    try {
      new Intl.DateTimeFormat("pt-BR", { timeZone: formData.timezone }).format(new Date());
    } catch {
      toast.error("Informe um fuso horário válido, por exemplo America/Sao_Paulo.");
      return;
    }

    updateMutation.mutate({
      ...formData,
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      address: formData.address.trim(),
      timezone: formData.timezone.trim(),
    });
  };

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    const strength = getPasswordStrength(pw);
    if (!strength.metAll) {
      toast.error("A senha não atende a todos os requisitos.");
      return;
    }
    if (pw !== pw2) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      toast.success("Senha alterada com sucesso!");
      setPw("");
      setPw2("");
    } catch (err) {
      toast.error(translateAuthError(err, "Não foi possível alterar a senha."));
    } finally {
      setPwLoading(false);
    }
  }

  const fetchAddress = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          const newAddress = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
          setFormData(prev => ({ ...prev, address: newAddress }));
          toast.success("Endereço localizado!");
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      }
    }
  };

  if (isLoading) return <div className="p-10 text-center">Carregando configurações...</div>;

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="font-display text-5xl font-bold tracking-tight text-foreground">Configurações da Empresa</h1>
        <p className="text-muted-foreground mt-3 text-xl font-medium">Gerencie as informações e preferências estratégicas do seu escritório.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="glass-card border-border shadow-sm rounded-2xl md:rounded-2xl overflow-hidden transition-all hover:shadow-md">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-xl flex items-center gap-2 text-primary">
              <ImageIcon className="h-5 w-5" />
              Logo do Escritório
            </CardTitle>
            <CardDescription>A logo aparecerá no seu perfil e nos relatórios gerados.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-4 flex flex-col md:flex-row items-center gap-6 md:gap-8">
             <div className="relative group">
                <div className="h-32 w-32 rounded-3xl bg-muted border-2 border-dashed border-primary/20 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary/50">
                   {formData.logo_url ? (
                     <img src={formData.logo_url} alt="Logo" className="h-full w-full object-contain" />
                   ) : (
                     <Building2 className="h-12 w-12 text-muted-foreground/30" />
                   )}
                   {uploading && (
                     <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                     </div>
                   )}
                </div>
                <Button 
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute -bottom-2 -right-2 rounded-xl shadow-lg border border-border"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/png,image/jpeg,image/webp" 
                  onChange={handleLogoUpload}
                />
             </div>
             <div className="flex-1 space-y-2 text-center md:text-left">
                <h4 className="font-bold">Personalize sua marca</h4>
                <p className="text-sm text-muted-foreground max-w-sm">
                   Recomendamos uma imagem quadrada com fundo transparente (PNG) para melhores resultados nos relatórios.
                </p>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Selecionar arquivo
                </Button>
             </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border shadow-sm rounded-2xl md:rounded-2xl overflow-hidden transition-all hover:shadow-md">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-xl flex items-center gap-2 text-primary">
              <Building2 className="h-5 w-5" />
              Informações Gerais
            </CardTitle>
            <CardDescription>Dados básicos de identificação da sua empresa.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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
              <CpfCnpjInput
                id="document"
                value={onlyDigits(formData.document)}
                onValueChange={(v) => setFormData(prev => ({ ...prev, document: v }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail de Contato</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={formData.email} 
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <PhoneInput
                id="phone"
                value={onlyDigits(formData.phone)}
                onValueChange={(v) => setFormData(prev => ({ ...prev, phone: v }))}
              />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="cep">CEP (Busca Automática)</Label>
              <CepInput
                id="cep"
                value={cep}
                onValueChange={(v) => {
                  setCep(v);
                  if (v.length === 8) fetchAddress(formatCep(v));
                }}
              />
            </div>
            <div className="space-y-2 md:col-span-1">
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

        <Card className="glass-card border-border shadow-sm rounded-2xl md:rounded-2xl overflow-hidden transition-all hover:shadow-md">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-xl flex items-center gap-2 text-primary">
              <Clock className="h-5 w-5" />
              Preferências de Sistema
            </CardTitle>
            <CardDescription>Configure horários padrão e fuso horário.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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
                  min="1"
                  max="24"
                  step="0.5"
                  onChange={e => setFormData(prev => ({ ...prev, default_daily_hours: Number(e.target.value) }))}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="submit" size="lg" disabled={updateMutation.isPending} className="rounded-xl md:rounded-[1.5rem] px-8 md:px-16 h-14 md:h-16 text-base md:text-lg font-extrabold tracking-tight shadow-sm shadow-primary/20 w-full sm:w-auto">
            {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </form>

      <Card className="glass-card border-border shadow-sm rounded-2xl md:rounded-2xl overflow-hidden transition-all hover:shadow-md">
        <CardHeader className="p-8 pb-4">
          <CardTitle className="text-xl flex items-center gap-2 text-primary">
            <Lock className="h-5 w-5" />
            Segurança da Conta
          </CardTitle>
          <CardDescription>Altere a senha que você usa para acessar o painel do escritório.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-8 pt-4">
          <form onSubmit={changePassword} className="space-y-4 max-w-md" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="admin-new-pw">Nova senha</Label>
              <PasswordInput
                id="admin-new-pw"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                minLength={8}
                required
                autoComplete="new-password"
                placeholder="Crie uma senha forte"
                aria-describedby="admin-new-pw-strength"
              />
              <div id="admin-new-pw-strength" className="pt-2">
                <PasswordStrengthMeter password={pw} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-new-pw2">Confirmar nova senha</Label>
              <PasswordInput
                id="admin-new-pw2"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                minLength={8}
                required
                autoComplete="new-password"
                placeholder="Repita a senha"
                aria-invalid={pw2.length > 0 && pw2 !== pw}
              />
              {pw2.length > 0 && pw2 !== pw && (
                <p className="text-xs text-destructive" role="alert">As senhas não coincidem.</p>
              )}
            </div>
            <Button type="submit" disabled={pwLoading} className="w-full rounded-xl" aria-busy={pwLoading}>
              {pwLoading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" aria-hidden /> : null}
              Alterar senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
