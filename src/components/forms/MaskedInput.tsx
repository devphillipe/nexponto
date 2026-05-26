import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type MaskedInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value" | "defaultValue"
> & {
  /** Valor LIMPO (sem máscara) controlado pelo consumidor */
  value: string;
  /** Recebe o valor limpo (sem máscara) */
  onValueChange: (clean: string) => void;
  /** format(clean) -> string com máscara para exibição */
  format: (raw: string) => string;
  /** unformat(formatted) -> string limpa para armazenamento */
  unformat?: (formatted: string) => string;
  /** Máx. de dígitos limpos */
  maxClean?: number;
};

const defaultUnformat = (s: string) => s.replace(/\D+/g, "");

/**
 * MaskedInput acessível:
 * - Mantém valor LIMPO no estado externo; exibe valor formatado.
 * - inputMode/autocomplete delegados ao consumidor.
 * - Permite colar, apagar e editar normalmente.
 * - Não bloqueia autofill.
 */
export const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  function MaskedInput(
    { value, onValueChange, format, unformat = defaultUnformat, maxClean, className, ...rest },
    ref,
  ) {
    const display = format(value);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      let clean = unformat(e.target.value);
      if (maxClean) clean = clean.slice(0, maxClean);
      onValueChange(clean);
    }

    return (
      <Input
        {...rest}
        ref={ref}
        value={display}
        onChange={handleChange}
        className={cn(className)}
      />
    );
  },
);
