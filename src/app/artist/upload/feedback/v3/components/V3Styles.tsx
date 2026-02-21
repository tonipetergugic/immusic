import React from "react";

export const V3HeroStyles = () => (
  <style>{`
    @keyframes v3Breathe {
      0%   { transform: translateX(-50%) translateY(0px) scale(1); opacity: 0.55; }
      50%  { transform: translateX(-50%) translateY(6px) scale(1.02); opacity: 0.75; }
      100% { transform: translateX(-50%) translateY(0px) scale(1); opacity: 0.55; }
    }
    .v3-hero-glow {
      animation: v3Breathe 8.5s ease-in-out infinite;
      will-change: transform, opacity;
    }
  `}</style>
);

export const V3JourneyStyles = () => (
  <style>{`
    @keyframes v3Shimmer {
      0%   { transform: translateX(-30%); opacity: 0.0; }
      20%  { opacity: 0.35; }
      50%  { opacity: 0.20; }
      100% { transform: translateX(130%); opacity: 0.0; }
    }
    @keyframes v3CurvePulse {
      0%   { opacity: 0.70; filter: blur(0px); }
      50%  { opacity: 0.95; filter: blur(0.4px); }
      100% { opacity: 0.70; filter: blur(0px); }
    }
    .v3-journey-shimmer {
      animation: v3Shimmer 3.6s ease-in-out infinite;
      will-change: transform, opacity;
    }
    .v3-curve-pulse {
      animation: v3CurvePulse 6.8s ease-in-out infinite;
      will-change: opacity, filter;
    }
  `}</style>
);
