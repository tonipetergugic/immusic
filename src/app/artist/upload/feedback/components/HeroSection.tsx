import React from "react";
import { V3HeroStyles } from "./V3Styles";

type Props = {
  queueTitle: string;
  banner: {
    badge: string;
    badgeClass: string;
    text: string;
  };
  heroChips: {
    structure: string;
    drop: string;
    hook: string;
    streaming: string;
  };
};

export default function HeroSection({ queueTitle, banner, heroChips }: Props) {
  return (
    <section className="relative overflow-hidden px-6 pt-12 pb-20 md:pt-16 md:pb-28">
      <V3HeroStyles />

      {/* Background layers */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0E0E10] via-[#0B1220] to-[#0E0E10]" />
        <div className="absolute -top-24 left-1/2 h-80 w-[900px] -translate-x-1/2 rounded-full bg-white/5 blur-3xl v3-hero-glow" />
      </div>

      <div className="relative">
        <div className="flex flex-col gap-3">
          <div className="text-sm md:text-base font-semibold tracking-wide text-white/70 uppercase">
            Feedback
          </div>

          <div className="flex flex-col gap-3">
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[0.95] text-white">
              {queueTitle}
            </h1>

            <div className="flex items-center gap-3 mt-2">
              <span
                className={
                  "text-xs px-3 py-1.5 rounded-full border font-semibold tracking-wide " +
                  banner.badgeClass
                }
              >
                {banner.badge}
              </span>
              <span className="text-lg md:text-xl text-white font-semibold tracking-tight">
                {banner.text}
              </span>
            </div>

            <p className="mt-2 text-white/60 text-lg md:text-xl font-medium">
              Pre-release structure, impact and translation analysis.
            </p>
          </div>

          <p className="mt-6 text-sm md:text-base text-white/60 leading-relaxed max-w-2xl">
            These results highlight probable technical imbalances. Always trust your ears — this feedback supports your decisions, it doesn't replace them.
          </p>
        </div>
      </div>
    </section>
  );
}
