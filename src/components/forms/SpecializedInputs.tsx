import * as React from "react";
import { MaskedInput, type MaskedInputProps } from "./MaskedInput";
import {
  formatCpf,
  formatCnpj,
  formatCpfOrCnpj,
  formatPhoneBr,
  formatCep,
  formatDateBr,
  formatTime,
  onlyDigits,
} from "@/lib/masks";

type Base = Omit<MaskedInputProps, "format" | "unformat" | "maxClean">;

export const CpfInput = React.forwardRef<HTMLInputElement, Base>((p, ref) => (
  <MaskedInput
    ref={ref}
    inputMode="numeric"
    autoComplete="off"
    placeholder="000.000.000-00"
    format={formatCpf}
    maxClean={11}
    {...p}
  />
));
CpfInput.displayName = "CpfInput";

export const CnpjInput = React.forwardRef<HTMLInputElement, Base>((p, ref) => (
  <MaskedInput
    ref={ref}
    inputMode="numeric"
    autoComplete="off"
    placeholder="00.000.000/0000-00"
    format={formatCnpj}
    maxClean={14}
    {...p}
  />
));
CnpjInput.displayName = "CnpjInput";

export const CpfCnpjInput = React.forwardRef<HTMLInputElement, Base>((p, ref) => (
  <MaskedInput
    ref={ref}
    inputMode="numeric"
    autoComplete="off"
    placeholder="CPF ou CNPJ"
    format={formatCpfOrCnpj}
    maxClean={14}
    {...p}
  />
));
CpfCnpjInput.displayName = "CpfCnpjInput";

export const PhoneInput = React.forwardRef<HTMLInputElement, Base>((p, ref) => (
  <MaskedInput
    ref={ref}
    type="tel"
    inputMode="tel"
    autoComplete="tel-national"
    placeholder="(00) 00000-0000"
    format={formatPhoneBr}
    maxClean={11}
    {...p}
  />
));
PhoneInput.displayName = "PhoneInput";

export const CepInput = React.forwardRef<HTMLInputElement, Base>((p, ref) => (
  <MaskedInput
    ref={ref}
    inputMode="numeric"
    autoComplete="postal-code"
    placeholder="00000-000"
    format={formatCep}
    maxClean={8}
    {...p}
  />
));
CepInput.displayName = "CepInput";

export const DateBrInput = React.forwardRef<HTMLInputElement, Base>((p, ref) => (
  <MaskedInput
    ref={ref}
    inputMode="numeric"
    autoComplete="off"
    placeholder="DD/MM/AAAA"
    format={formatDateBr}
    maxClean={8}
    {...p}
  />
));
DateBrInput.displayName = "DateBrInput";

export const TimeInput = React.forwardRef<HTMLInputElement, Base>((p, ref) => (
  <MaskedInput
    ref={ref}
    inputMode="numeric"
    autoComplete="off"
    placeholder="HH:mm"
    format={formatTime}
    maxClean={4}
    {...p}
  />
));
TimeInput.displayName = "TimeInput";

export { onlyDigits };
