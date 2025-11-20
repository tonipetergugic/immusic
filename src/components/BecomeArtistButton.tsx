"use client";

import { becomeArtist } from "@/app/dashboard/become-artist/action";
import { useTransition } from "react";

export function BecomeArtistButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() =>
        startTransition(() => {
          becomeArtist();
        })
      }
      className="px-4 py-2 rounded bg-[#00FFC6] text-black font-semibold hover:bg-[#00E0B0] transition"
    >
      {isPending ? "Updating..." : "Become Artist"}
    </button>
  );
}
