import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function SectionDivider() {
  return (
    <div className="h-10" />
  );
}

export function Stat({
  label,
  value,
  hint,
  valueClassName,
}: {
  label: string;
  value: string;
  hint?: string;
  valueClassName?: string;
}) {
  return (
    <div className="relative group text-center h-16 flex flex-col items-center justify-end">
      <p
        className={`text-3xl font-semibold leading-none transition group-hover:text-[#00FFC6] ${
          valueClassName ?? "text-white"
        }`}
      >
        {value}
      </p>

      <p className="mt-2 text-xs uppercase tracking-wide text-white/40 leading-none">
        {label}
      </p>
    </div>
  );
}

export function MenuTile(props: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={props.href}
      className="
        group relative overflow-hidden rounded-2xl
        bg-[#121216] border border-white/5
        p-6 transition
        hover:-translate-y-0.5
        hover:border-[#00FFC6]/35 hover:bg-[#14141a]
        focus:outline-none focus:ring-2 focus:ring-[#00FFC6]/40
        h-full
      "
    >
      <div className="absolute right-4 top-4 text-white/30 group-hover:text-[#00FFC6]/80 transition">
        <ChevronRight className="h-5 w-5" />
      </div>

      <div className="flex h-full flex-col">
        <div className="flex items-start gap-4">
          <div
            className="
              mt-0.5 shrink-0 rounded-xl
              bg-white/5 border border-white/10
              p-3 text-white/90
              transition
              group-hover:text-[#00FFC6]
              group-hover:border-[#00FFC6]/35
              group-hover:bg-[#00FFC6]/[0.08]
            "
          >
            {props.icon}
          </div>

          <div className="min-w-0">
            <p className="text-lg font-semibold text-white">{props.title}</p>
            <p className="mt-1 text-sm text-[#B3B3B3]">{props.description}</p>
          </div>
        </div>

        <div className="mt-auto pt-4">
          <p className="text-xs text-white/35 group-hover:text-[#00FFC6]/70 transition">
            Open →
          </p>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition">
        <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-[#00FFC6]/10 blur-2xl" />
      </div>
    </Link>
  );
}
