"use client";

import { useRouter } from "next/navigation";

export default function ReleaseBackButton({
  fallbackHref = "/dashboard",
}: {
  fallbackHref?: string;
}) {
  const router = useRouter();

  function onBack() {
    // Wenn es keine History gibt (z.B. direkter Link), fallback
    if (typeof window !== "undefined" && window.history.length <= 1) {
      router.push(fallbackHref);
      return;
    }
    router.back();
  }

  return (
    <button
      type="button"
      onClick={onBack}
      className="
        inline-flex items-center gap-2
        text-base md:text-lg
        text-neutral-300 hover:text-[#00FFC6]
        transition-colors
        px-2 py-1 -ml-2
        rounded-lg
      "
      aria-label="Go back"
    >
      <span aria-hidden>←</span>
      <span>Back</span>
    </button>
  );
}

