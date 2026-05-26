import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPasswordStrength, passwordRequirements } from "@/lib/validators";

type Props = {
  password: string;
  showRequirements?: boolean;
  className?: string;
};

const TONE_BG: Record<string, string> = {
  destructive: "bg-destructive",
  warning: "bg-yellow-500",
  primary: "bg-primary",
  success: "bg-emerald-500",
};

const TONE_TEXT: Record<string, string> = {
  destructive: "text-destructive",
  warning: "text-yellow-600 dark:text-yellow-500",
  primary: "text-primary",
  success: "text-emerald-600 dark:text-emerald-500",
};

/**
 * Barra de força de senha acessível.
 * - 5 segmentos visuais + texto descritivo ("Forte", "Média"...).
 * - Lista de requisitos com ícones E texto (não depende só de cor).
 * - aria-live="polite" para anunciar mudanças a leitores de tela.
 */
export function PasswordStrengthMeter({ password, showRequirements = true, className }: Props) {
  const strength = getPasswordStrength(password);
  const filled = strength.score;

  return (
    <div className={cn("space-y-3", className)} aria-live="polite">
      <div className="space-y-1.5">
        <div className="flex gap-1.5" role="meter" aria-valuemin={0} aria-valuemax={5} aria-valuenow={filled} aria-label={`Força da senha: ${strength.label}`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-200",
                i < filled ? TONE_BG[strength.tone] : "bg-muted",
              )}
            />
          ))}
        </div>
        <p className={cn("text-xs font-semibold", password ? TONE_TEXT[strength.tone] : "text-muted-foreground")}>
          {password ? `Força da senha: ${strength.label}` : "Digite uma senha para ver a força."}
        </p>
      </div>

      {showRequirements && (
        <ul className="space-y-1.5 text-xs">
          {passwordRequirements.map((req) => {
            const ok = req.test(password);
            return (
              <li
                key={req.id}
                className={cn(
                  "flex items-center gap-2 transition-colors",
                  ok ? "text-emerald-600 dark:text-emerald-500" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid place-items-center h-4 w-4 rounded-full shrink-0",
                    ok ? "bg-emerald-500/15" : "bg-muted/60",
                  )}
                  aria-hidden
                >
                  {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                </span>
                <span>
                  <span className="sr-only">{ok ? "Requisito atendido: " : "Requisito pendente: "}</span>
                  {req.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
