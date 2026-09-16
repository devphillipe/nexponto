// Dias de trabalho por colaborador. 0 = domingo ... 6 = sábado.

export const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5];

export const WEEK_DAYS: { value: number; short: string; long: string }[] = [
  { value: 1, short: "Seg", long: "Segunda-feira" },
  { value: 2, short: "Ter", long: "Terça-feira" },
  { value: 3, short: "Qua", long: "Quarta-feira" },
  { value: 4, short: "Qui", long: "Quinta-feira" },
  { value: 5, short: "Sex", long: "Sexta-feira" },
  { value: 6, short: "Sáb", long: "Sábado" },
  { value: 0, short: "Dom", long: "Domingo" },
];

/** Garante um array válido de dias (0-6), sem duplicados, com fallback Seg–Sex. */
export function normalizeWorkDays(value: unknown): number[] {
  if (!Array.isArray(value)) return [...DEFAULT_WORK_DAYS];
  const clean = Array.from(
    new Set(
      value
        .map((v) => Number(v))
        .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6),
    ),
  );
  return clean.length ? clean.sort((a, b) => a - b) : [...DEFAULT_WORK_DAYS];
}

/** Verifica se a data (Date ou "yyyy-MM-dd") cai em um dia de trabalho. */
export function worksOn(workDays: unknown, date: Date | string): boolean {
  const days = normalizeWorkDays(workDays);
  const d = typeof date === "string" ? new Date(`${date}T12:00:00`) : date;
  return days.includes(d.getDay());
}

/** Texto amigável: "Seg a Sex", "Todos os dias" ou lista abreviada. */
export function formatWorkDays(value: unknown): string {
  const days = normalizeWorkDays(value);
  const set = new Set(days);
  if (set.size === 7) return "Todos os dias";
  if (set.size === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d))) return "Seg a Sex";
  return WEEK_DAYS.filter((d) => set.has(d.value))
    .map((d) => d.short)
    .join(", ");
}
