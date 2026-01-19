"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

type BackLinkProps = {
  label?: string;
  className?: string;
};

export default function BackLink({ label = "Back", className = "" }: BackLinkProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={[
        "inline-flex items-center gap-2",
        "text-white/70",
        "hover:text-[#00FFC6] active:text-[#00FFC6]",
        "transition-colors",
        "text-base",
        className,
      ].join(" ")}
      aria-label={label}
    >
      <ArrowLeft
        className="
          w-5 h-5
          transition-all
          hover:drop-shadow-[0_0_10px_rgba(0,255,198,0.6)]
          active:drop-shadow-[0_0_14px_rgba(0,255,198,0.8)]
        "
      />
      <span
        className="
          transition-all
          hover:drop-shadow-[0_0_10px_rgba(0,255,198,0.6)]
          active:drop-shadow-[0_0_14px_rgba(0,255,198,0.8)]
        "
      >
        {label}
      </span>
    </button>
  );
}
