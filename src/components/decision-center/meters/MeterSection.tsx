import type { ReactNode } from "react";

type MeterSectionProps = {
  eyebrow: string;
  title: string;
  description: string;
  gridClassName: string;
  children: ReactNode;
};

export function MeterSection({
  eyebrow,
  title,
  description,
  gridClassName,
  children,
}: MeterSectionProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-lg font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-400">
          {description}
        </p>
      </div>

      <div className={gridClassName}>{children}</div>
    </section>
  );
}
