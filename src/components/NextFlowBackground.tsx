import React from "react";

/**
 * Lightweight static background.
 * A single, subtle radial glow behind the hero — no animations, no SVG,
 * no particles. Kept as `NextFlowBackground` for import compatibility.
 */
export const NextFlowBackground: React.FC = React.memo(() => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-20 pointer-events-none bg-background"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(0,229,255,0.07), transparent 70%)",
      }}
    />
  );
});

NextFlowBackground.displayName = "NextFlowBackground";
