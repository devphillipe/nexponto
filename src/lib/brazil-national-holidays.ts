export type BrazilNationalHoliday = {
  date: string;
  name: string;
};

/**
 * Feriados nacionais fixos considerados automaticamente pelo NexPonto.
 *
 * Não inclui feriados estaduais, municipais nem pontos facultativos
 * (ex.: Carnaval e Corpus Christi). Esses continuam sendo lançados
 * manualmente pelo escritório quando aplicáveis.
 */
export function getBrazilNationalHolidays(year: number): BrazilNationalHoliday[] {
  const holidays: BrazilNationalHoliday[] = [
    { date: `${year}-01-01`, name: "Confraternização Universal" },
    { date: `${year}-04-21`, name: "Tiradentes" },
    { date: `${year}-05-01`, name: "Dia do Trabalho" },
    { date: `${year}-09-07`, name: "Independência do Brasil" },
    { date: `${year}-10-12`, name: "Nossa Senhora Aparecida" },
    { date: `${year}-11-02`, name: "Finados" },
    { date: `${year}-11-15`, name: "Proclamação da República" },
    { date: `${year}-12-25`, name: "Natal" },
  ];

  // Tornou-se feriado nacional a partir de 2024.
  if (year >= 2024) {
    holidays.splice(7, 0, {
      date: `${year}-11-20`,
      name: "Dia Nacional de Zumbi e da Consciência Negra",
    });
  }

  return holidays;
}

export function getBrazilNationalHoliday(
  date: Date | string,
): BrazilNationalHoliday | null {
  const dateStr =
    typeof date === "string"
      ? date.slice(0, 10)
      : [
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, "0"),
          String(date.getDate()).padStart(2, "0"),
        ].join("-");

  const year = Number(dateStr.slice(0, 4));
  if (!Number.isInteger(year)) return null;

  return (
    getBrazilNationalHolidays(year).find((holiday) => holiday.date === dateStr) ??
    null
  );
}

export function isBrazilNationalHoliday(date: Date | string): boolean {
  return getBrazilNationalHoliday(date) !== null;
}
