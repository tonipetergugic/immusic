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
  const bannerTextClass = banner.badgeClass.includes("text-red-")
    ? "text-red-200"
    : banner.badgeClass.includes("text-yellow-")
      ? "text-yellow-200"
      : banner.badgeClass.includes("text-emerald-")
        ? "text-[#00FFC6]"
        : "text-white";

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

            <div className="mt-1.5">
              <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                <span className={"text-xl font-semibold tracking-tight md:text-2xl " + bannerTextClass}>
                  {banner.text}
                </span>
              </div>
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
