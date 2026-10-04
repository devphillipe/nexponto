import React from "react";

export const NextFlowBackground: React.FC = React.memo(() => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-20 pointer-events-none bg-background"
      style={{
        backgroundImage:
          "radial-gradient(circle at 12% 8%, rgba(37,99,235,0.08), transparent 28%), radial-gradient(circle at 88% 16%, rgba(34,211,238,0.08), transparent 24%), linear-gradient(180deg, #ffffff 0%, #f7f9fc 48%, #f7f9fc 100%)",
      }}
    />
  );
});

NextFlowBackground.displayName = "NextFlowBackground";
