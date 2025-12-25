"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function AvailableReleasesSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const initial = params.get("q") ?? "";
  const [q, setQ] = useState(initial);

  useEffect(() => {
    setQ(initial);
  }, [initial]);

  function apply(next: string) {
    const sp = new URLSearchParams(params.toString());
    const trimmed = next.trim();
    if (!trimmed) sp.delete("q");
    else sp.set("q", trimmed);
    router.replace(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="w-full max-w-xs">
      <label className="sr-only" htmlFor="release-search">
        Search
      </label>
      <input
        id="release-search"
        value={q}
        onChange={(e) => {
          const v = e.target.value;
          setQ(v);
          apply(v);
        }}
        placeholder="Search…"
        className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
      />
    </div>
  );
}

