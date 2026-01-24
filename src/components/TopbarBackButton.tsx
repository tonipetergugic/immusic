"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function TopbarBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="
        inline-flex items-center justify-center
        w-10 h-10 rounded-xl
        bg-[#111113]
        border border-[#1A1A1C]
        text-[#B3B3B3]
        hover:border-[#00FFC6]
        hover:text-[#00FFC6]
        transition
      "
      aria-label="Go back"
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
  );
}
