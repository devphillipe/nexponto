import { memo } from "react";

interface LogoProps {
  size?: number;
  className?: string;
}

export const LogoMark = memo(function LogoMark({ size = 28, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M6 31V9.5C6 7.8 8.05 6.95 9.25 8.15L24.8 23.7V31L12.8 19V31H6Z"
        fill="#2563EB"
      />
      <path
        d="M17.2 16.3L28.2 5.3C29.45 4.05 31.6 4.95 31.6 6.7V28.6C31.6 30.45 29.35 31.35 28.1 30L17.2 18.9V16.3Z"
        fill="#22D3EE"
      />
      <circle cx="33.1" cy="7.2" r="4.4" fill="#2563EB" />
      <circle cx="8.2" cy="33" r="3.2" fill="#FFFFFF" stroke="#071A2B" strokeWidth="1.6" />
    </svg>
  );
});

interface FullLogoProps extends LogoProps {
  showWordmark?: boolean;
  wordmarkClassName?: string;
  inverse?: boolean;
}

export const Logo = memo(function Logo({
  size = 28,
  className = "",
  showWordmark = true,
  wordmarkClassName = "",
  inverse = false,
}: FullLogoProps) {
  return (
    <div className={"inline-flex items-center gap-3 " + className}>
      <span className="grid place-items-center">
        <LogoMark size={size} />
      </span>
      {showWordmark && (
        <span className={"font-display font-extrabold tracking-[-0.035em] " + (inverse ? "text-white " : "text-[#071A2B] ") + wordmarkClassName}>
          Nex<span className="text-primary">Ponto</span>
        </span>
      )}
    </div>
  );
});

Logo.displayName = "Logo";
