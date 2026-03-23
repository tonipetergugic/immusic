"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfileSuccessToast({
  message,
}: {
  message: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/artist/profile");
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#00FFC6]/20 bg-[#00FFC6]/10 px-4 py-3 text-sm text-[#00FFC6]">
      <span>{message}</span>
      <span className="rounded-full border border-[#00FFC6]/20 bg-black/20 px-2 py-1 text-xs text-[#B3B3B3]">
        Success
      </span>
    </div>
  );
}

