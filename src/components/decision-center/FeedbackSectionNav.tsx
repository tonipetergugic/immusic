import Link from "next/link";

const NAV_ITEMS = [
  {
    label: "AI Consultant",
    href: "#ai-consultant",
    isExternal: false,
  },
  {
    label: "Arrangement",
    href: "#structure-movement",
    isExternal: false,
  },
  {
    label: "Journey",
    href: "#track-journey",
    isExternal: false,
  },
  {
    label: "Meters",
    href: "/decision-center-lab/feedback/meters",
    isExternal: true,
  },
] as const;

export function FeedbackSectionNav() {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-4">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Quick navigation
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {NAV_ITEMS.map((item) =>
          item.isExternal ? (
            <Link
              key={item.label}
              href={item.href}
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-[#00FFC6]/40 hover:text-white"
            >
              {item.label}
            </Link>
          ) : (
            <a
              key={item.label}
              href={item.href}
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-[#00FFC6]/40 hover:text-white"
            >
              {item.label}
            </a>
          ),
        )}
      </div>
    </section>
  );
}
