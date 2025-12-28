"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfileSuccessToast() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/artist/profile");
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="rounded-2xl border border-[#00FFC6]/20 bg-[#00FFC6]/10 px-4 py-3 text-sm text-[#00FFC6] flex items-center justify-between">
      <span>Profile saved</span>
      <span className="text-xs px-2 py-1 rounded-full border border-[#00FFC6]/20 bg-black/20 text-[#B3B3B3]">
        Success
      </span>
    </div>
  );
}

