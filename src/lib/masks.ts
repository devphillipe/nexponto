// Máscaras BR — todas puras, com format/unformat/isValid.
// Sempre armazene o valor LIMPO no estado; use format() apenas na exibição.

export const onlyDigits = (v: string) => v.replace(/\D+/g, "");

// ---------- CPF ----------
export function formatCpf(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}
export function isValidCpf(v: string) {
  const c = onlyDigits(v);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(c[i]) * (10 - i);
  let d1 = (s * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(c[9])) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(c[i]) * (11 - i);
  let d2 = (s * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === parseInt(c[10]);
}

// ---------- CNPJ ----------
export function formatCnpj(v: string) {
  const d = onlyDigits(v).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}
export function isValidCnpj(v: string) {
  const c = onlyDigits(v);
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const calc = (base: string) => {
    const w = base.length === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    const sum = base.split("").reduce((acc, n, i) => acc + parseInt(n) * w[i], 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(c.slice(0, 12));
  const d2 = calc(c.slice(0, 12) + d1);
  return d1 === parseInt(c[12]) && d2 === parseInt(c[13]);
}

// ---------- CPF/CNPJ dinâmico ----------
export function formatCpfOrCnpj(v: string) {
  const d = onlyDigits(v);
  return d.length <= 11 ? formatCpf(d) : formatCnpj(d);
}
export function isValidCpfOrCnpj(v: string) {
  const d = onlyDigits(v);
  return d.length <= 11 ? isValidCpf(d) : isValidCnpj(d);
}

// ---------- Telefone BR ----------
export function formatPhoneBr(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return d
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}
export function isValidPhoneBr(v: string) {
  const d = onlyDigits(v);
  return d.length === 10 || d.length === 11;
}

// ---------- CEP ----------
export function formatCep(v: string) {
  return onlyDigits(v).slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
}
export const isValidCep = (v: string) => onlyDigits(v).length === 8;

// ---------- Data DD/MM/AAAA ----------
export function formatDateBr(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  return d
    .replace(/^(\d{2})(\d)/, "$1/$2")
    .replace(/^(\d{2})\/(\d{2})(\d)/, "$1/$2/$3");
}
export function isValidDateBr(v: string) {
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return false;
  const [, dd, mm, yyyy] = m;
  const day = +dd, mon = +mm - 1, year = +yyyy;
  const dt = new Date(year, mon, day);
  return dt.getFullYear() === year && dt.getMonth() === mon && dt.getDate() === day;
}
export function dateBrToIso(v: string) {
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
}
export function dateIsoToBr(iso: string) {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

// ---------- Hora HH:mm ----------
export function formatTime(v: string) {
  const d = onlyDigits(v).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}:${d.slice(2)}`;
}
export function isValidTime(v: string) {
  const m = v.match(/^(\d{2}):(\d{2})$/);
  if (!m) return false;
  const h = +m[1], min = +m[2];
  return h >= 0 && h < 24 && min >= 0 && min < 60;
}
