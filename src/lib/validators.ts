import { z } from "zod";
import {
  isValidCpf,
  isValidCnpj,
  isValidPhoneBr,
  isValidCep,
  isValidDateBr,
  isValidTime,
  onlyDigits,
} from "./masks";

// ============ Schemas Zod reutilizáveis ============

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Informe um e-mail.")
  .email("Informe um e-mail válido.")
  .max(255);

export const cpfSchema = z
  .string()
  .transform(onlyDigits)
  .refine((v) => v.length === 11 && isValidCpf(v), "Informe um CPF válido.");

export const cnpjSchema = z
  .string()
  .transform(onlyDigits)
  .refine((v) => v.length === 14 && isValidCnpj(v), "Informe um CNPJ válido.");

export const phoneSchema = z
  .string()
  .transform(onlyDigits)
  .refine(isValidPhoneBr, "Informe um telefone válido com DDD.");

export const cepSchema = z
  .string()
  .transform(onlyDigits)
  .refine(isValidCep, "Informe um CEP válido.");

export const dateBrSchema = z
  .string()
  .refine(isValidDateBr, "Informe uma data válida (DD/MM/AAAA).");

export const timeSchema = z
  .string()
  .refine(isValidTime, "Informe um horário válido (HH:mm).");

// ============ Senhas ============

export type PasswordRequirement = {
  id: string;
  label: string;
  test: (pw: string) => boolean;
};

export const passwordRequirements: PasswordRequirement[] = [
  { id: "len", label: "Mínimo de 8 caracteres", test: (p) => p.length >= 8 },
  { id: "up", label: "Uma letra maiúscula", test: (p) => /[A-Z]/.test(p) },
  { id: "low", label: "Uma letra minúscula", test: (p) => /[a-z]/.test(p) },
  { id: "num", label: "Um número", test: (p) => /\d/.test(p) },
  { id: "sym", label: "Um caractere especial", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4 | 5;
  label: "Muito fraca" | "Fraca" | "Média" | "Boa" | "Forte" | "Muito forte";
  tone: "destructive" | "warning" | "primary" | "success";
  metAll: boolean;
  failing: PasswordRequirement[];
};

export function getPasswordStrength(pw: string): PasswordStrength {
  const passed = passwordRequirements.filter((r) => r.test(pw));
  const score = passed.length as PasswordStrength["score"];
  const failing = passwordRequirements.filter((r) => !r.test(pw));
  const label =
    score <= 1 ? "Muito fraca"
    : score === 2 ? "Fraca"
    : score === 3 ? "Média"
    : score === 4 ? "Boa"
    : "Forte";
  const tone: PasswordStrength["tone"] =
    score <= 2 ? "destructive"
    : score === 3 ? "warning"
    : score === 4 ? "primary"
    : "success";
  return { score: score as PasswordStrength["score"], label, tone, metAll: score === 5, failing };
}

// Schema Zod para senha forte (use no submit, após o usuário "terminar")
export const strongPasswordSchema = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres.")
  .refine((p) => /[A-Z]/.test(p), "A senha precisa de uma letra maiúscula.")
  .refine((p) => /[a-z]/.test(p), "A senha precisa de uma letra minúscula.")
  .refine((p) => /\d/.test(p), "A senha precisa de um número.")
  .refine((p) => /[^A-Za-z0-9]/.test(p), "A senha precisa de um caractere especial.");

export function passwordsMatch(a: string, b: string) {
  return a.length > 0 && a === b;
}

// ============ Sequência de ponto ============

export type PunchType = "entrada" | "saida_almoco" | "retorno_almoco" | "saida";

const ORDER: PunchType[] = ["entrada", "saida_almoco", "retorno_almoco", "saida"];

export function validatePunchSequence(times: Partial<Record<PunchType, string>>): string | null {
  const present = ORDER.filter((k) => times[k] && isValidTime(times[k]!));
  for (let i = 1; i < present.length; i++) {
    const prev = times[present[i - 1]]!;
    const curr = times[present[i]]!;
    if (curr <= prev) {
      const labels: Record<PunchType, string> = {
        entrada: "entrada",
        saida_almoco: "saída para almoço",
        retorno_almoco: "retorno do almoço",
        saida: "saída final",
      };
      return `A ${labels[present[i]]} não pode ser antes da ${labels[present[i - 1]]}.`;
    }
  }
  return null;
}
