import React from "react";

type Banner = {
  badge: string;
  badgeClass: string;
  text: string;
};

type HeroChips = {
  structure: string;
  drop: string;
  hook: string;
  streaming: string;
};

type Props = {
  queueTitle: string;
  banner: Banner;
  heroChips: HeroChips;
  V3HeroStyles: React.ComponentType;
};

export default function FeedbackHero({ queueTitle, banner, heroChips, V3HeroStyles }: Props) {
  return (
    <section className="relative overflow-hidden px-6 pt-12 pb-20 md:pt-16 md:pb-28">
      <V3HeroStyles />
      {/* Background layers (static for now; subtle motion comes in Hero module step) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0E0E10] via-[#0B1220] to-[#0E0E10]" />
        <div className="absolute -top-24 left-1/2 h-80 w-[900px] -translate-x-1/2 rounded-full bg-white/5 blur-3xl v3-hero-glow" />
      </div>

      <div className="relative">
        <div className="flex flex-col gap-3">
          <div className="text-xs text-white/50">Feedback</div>

          <div className="flex flex-col gap-1">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">{queueTitle}</h1>
            <p className="text-white/50 text-base md:text-lg">Structure & impact overview — designed for fast understanding.</p>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={"text-[10px] px-2 py-1 rounded-full border font-semibold tracking-wide " + banner.badgeClass}>
              {banner.badge}
            </span>
            <span className="text-xs text-white/70">{banner.text}</span>
          </div>

          {/* Status chips (neutral, null-safe) */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            {[
              { title: "Structure", value: heroChips.structure },
              { title: "Drop", value: heroChips.drop },
              { title: "Hook", value: heroChips.hook },
              { title: "Streaming", value: heroChips.streaming },
            ].map((x) => (
              <div
                key={x.title}
                className="group relative overflow-hidden rounded-full border border-white/15 bg-white/[0.04] px-6 py-3 backdrop-blur-sm transition-all duration-300 hover:border-white/30 hover:bg-white/[0.08]"
              >
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>

                <div className="relative flex items-center gap-3">
                  <span className="text-[11px] uppercase tracking-wider text-white/40">{x.title}</span>
                  <span className="text-sm font-semibold text-white/85">{x.value}</span>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-white/40">
            Note: Feedback is tied to the exact audio file. Re-uploading requires a new unlock.
          </p>
        </div>
      </div>
    </section>
  );
}
