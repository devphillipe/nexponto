import { memo } from "react";

interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * NexPonto logo mark.
 * An "N" formed by a forward-leaning chevron stroke with a solid dot ("ponto")
 * marking the corner — symbolizing "next point in time".
 */
export const LogoMark = memo(function LogoMark({ size = 28, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* N stroke */}
      <path
        d="M7 25V7L25 25V13"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Ponto */}
      <circle cx="25" cy="7" r="3" fill="currentColor" />
    </svg>
  );
});

interface LogoProps2 extends LogoProps {
  showWordmark?: boolean;
  wordmarkClassName?: string;
}

export const Logo = memo(function Logo({
  size = 28,
  className = "",
  showWordmark = true,
  wordmarkClassName = "",
}: LogoProps2) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="grid place-items-center rounded-xl bg-primary/10 text-primary p-2 border border-primary/20">
        <LogoMark size={size} />
      </span>
      {showWordmark && (
        <span className={`font-display font-bold tracking-tight ${wordmarkClassName}`}>
          Nex<span className="text-primary">Ponto</span>
        </span>
      )}
    </div>
  );
});
