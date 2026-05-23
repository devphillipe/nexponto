import React, { useMemo } from 'react';

export const NextFlowBackground: React.FC = () => {
  const lines = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 10}s`,
      duration: `${15 + Math.random() * 15}s`,
      opacity: 0.1 + Math.random() * 0.15,
      width: 1 + Math.random() * 2,
    }));
  }, []);

  return (
    <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none bg-background">
      {/* Dynamic flowing lines */}
      <svg className="absolute inset-0 w-full h-full opacity-40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="var(--color-primary)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
          
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {lines.map((line) => (
          <g key={line.id} style={{ opacity: line.opacity }}>
            {/* Base static line for the path */}
            <line
              x1="-20%"
              y1="120%"
              x2="120%"
              y2="-20%"
              stroke="var(--color-primary)"
              strokeWidth="0.5"
              strokeOpacity="0.1"
              transform={`translate(${(parseInt(line.left) - 50) * 10}, 0)`}
            />
            
            {/* The moving pulse line */}
            <path
              d="M -100 1100 L 1100 -100"
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth={line.width}
              filter="url(#glow)"
              style={{
              transform: `translateX(${(parseInt(line.left) - 50) * 5}px)`,
              animation: `nextFlowMove ${line.duration} linear infinite`,
              animationDelay: line.delay,
              willChange: 'transform, stroke-dashoffset'
            }}
              className="motion-reduce:hidden"
            />
          </g>
        ))}
      </svg>

      {/* Floating particles */}
      <div className="absolute inset-0">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-primary motion-safe:animate-pulse-slow"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${1 + Math.random() * 2}px`,
              height: `${1 + Math.random() * 2}px`,
              opacity: 0.1 + Math.random() * 0.2,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Global gradients for depth */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(0,229,255,0.03)_0%,transparent_50%)]"></div>
      
      <style>{`
        @keyframes nextFlowMove {
          0% { stroke-dasharray: 0 2000; stroke-dashoffset: 0; }
          100% { stroke-dasharray: 400 2000; stroke-dashoffset: -2000; }
        }
      `}</style>
    </div>
  );
};
