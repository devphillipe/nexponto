import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  inputClassName?: string;
};

/**
 * PasswordInput — campo de senha com toggle mostrar/ocultar acessível.
 * - Botão tem aria-label dinâmico e aria-pressed.
 * - autocomplete fica a cargo do consumidor (ex.: "new-password" ou "current-password").
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, Props>(
  function PasswordInput({ className, inputClassName, ...props }, ref) {
    const [visible, setVisible] = React.useState(false);
    return (
      <div className={cn("relative", className)}>
        <Input
          {...props}
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn("pr-11", inputClassName)}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
          tabIndex={0}
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>
    );
  }
);
