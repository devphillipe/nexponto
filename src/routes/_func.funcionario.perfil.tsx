import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useRef } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PasswordInput } from "@/components/forms/PasswordInput";
import { PasswordStrengthMeter } from "@/components/forms/PasswordStrengthMeter";
import { getPasswordStrength } from "@/lib/validators";
import { toast } from "sonner";
import { translateAuthError } from "@/lib/auth-errors";
import { Camera, Lock, User as UserIcon, Loader2, Check } from "lucide-react";

export const Route = createFileRoute("/_func/funcionario/perfil")({
  head: () => ({ meta: [{ title: "Meu Perfil — NexPonto" }] }),
  component: PerfilPage,
});

async function getCroppedBlob(imageSrc: string, area: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = imageSrc;
  });
  const canvas = document.createElement("canvas");
  const size = 512;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
  return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.9));
}

function PerfilPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const onCropComplete = useCallback((_: Area, areaPx: Area) => setCroppedArea(areaPx), []);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImgSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(f);
  }

  async function saveAvatar() {
    if (!imgSrc || !croppedArea || !user) return;
    setUploading(true);
    try {
      const blob = await getCroppedBlob(imgSrc, croppedArea);
      const path = `${user.id}/avatar-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (upErr) throw upErr;
      // Private bucket: store only the object path; signed URLs are generated on read.
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", user.id);

      if (dbErr) throw dbErr;
      toast.success("Foto de perfil atualizada!");
      setImgSrc(null);
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (e) {
      toast.error(translateAuthError(e, "Não foi possível salvar a foto."));
    } finally {
      setUploading(false);
    }
  }

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
    } catch (e) {
      toast.error(translateAuthError(e, "Não foi possível alterar a senha."));
    } finally {
      setPwLoading(false);
    }
  }

  const initial = profile?.full_name?.charAt(0) || "U";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground mt-1 text-sm">Atualize sua foto e altere sua senha.</p>
      </div>

      <Card className="glass-card border-border/40 rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Camera className="h-5 w-5 text-primary" /> Foto de Perfil
          </CardTitle>
          <CardDescription>Escolha uma imagem e ajuste a área que será exibida.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {!imgSrc ? (
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 grid place-items-center font-bold text-2xl text-primary border border-primary/10 overflow-hidden shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  initial
                )}
              </div>
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <p className="text-sm text-muted-foreground">JPG, PNG ou WebP — até 5MB.</p>
                <Button onClick={() => fileRef.current?.click()} variant="outline" className="rounded-xl">
                  <Camera className="h-5 w-5 mr-2" /> Selecionar imagem
                </Button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative w-full h-72 bg-muted/20 rounded-xl overflow-hidden">
                <Cropper
                  image={imgSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider">Zoom</Label>
                <Slider value={[zoom]} min={1} max={3} step={0.05} onValueChange={(v) => setZoom(v[0])} />
              </div>
              <div className="flex gap-3">
                <Button onClick={saveAvatar} disabled={uploading} className="flex-1 rounded-xl">
                  {uploading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Check className="h-5 w-5 mr-2" />}
                  Salvar foto
                </Button>
                <Button variant="outline" onClick={() => setImgSrc(null)} disabled={uploading} className="rounded-xl">
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card border-border/40 rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserIcon className="h-5 w-5 text-primary" /> Dados da Conta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nome</Label>
            <Input value={profile?.full_name || ""} disabled className="bg-muted/20" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">E-mail</Label>
            <Input value={profile?.email || ""} disabled className="bg-muted/20" />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-border/40 rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5 text-primary" /> Alterar Senha
          </CardTitle>
          <CardDescription>Defina uma nova senha de acesso.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="new-pw">Nova senha</Label>
              <PasswordInput
                id="new-pw"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                minLength={8}
                required
                autoComplete="new-password"
                placeholder="Crie uma senha forte"
                aria-describedby="new-pw-strength"
              />
              <div id="new-pw-strength" className="pt-2">
                <PasswordStrengthMeter password={pw} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-pw2">Confirmar nova senha</Label>
              <PasswordInput
                id="new-pw2"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                minLength={8}
                required
                autoComplete="new-password"
                placeholder="Repita a senha"
                aria-invalid={pw2.length > 0 && pw2 !== pw}
              />
              {pw2.length > 0 && pw2 !== pw && (
                <p className="text-xs text-destructive">As senhas não coincidem.</p>
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
