"use client";

import { useEffect, useState, useTransition } from "react";
import HomeReleasesDndItem from "./HomeReleasesDndItem";
import HomeReleasesDndList from "./HomeReleasesDndList";
import CoverPlaceholder from "@/components/CoverPlaceholder";

type ReleaseRow = {
  id: string;
  title: string | null;
  status: string | null;
  cover_src: string | null;
  artist_name: string | null;
  homeItemId: string;
  position: number;
};

export default function HomeReleasesOnHomeWrapper(props: {
  moduleId: string;
  homeReleases: ReleaseRow[];
  onRemove: (releaseId: string) => Promise<void>;
}) {
  const { moduleId, homeReleases, onRemove } = props;
  const [pending, startTransition] = useTransition();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // SSR-safe placeholder to avoid @dnd-kit hydration mismatch
    return (
      <div className="space-y-2">
        {homeReleases.slice(0, 4).map((r) => (
          <div
            key={r.homeItemId}
            className="flex items-center justify-between rounded-md bg-black/30 px-3 py-2 min-h-[72px]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-14 w-14 shrink-0 rounded-md bg-white/10 border border-white/10" />
              <div className="min-w-0">
                <div className="h-4 w-40 rounded bg-white/10" />
                <div className="mt-2 h-3 w-28 rounded bg-white/10" />
              </div>
            </div>
            <div className="w-24 h-8 rounded-md bg-white/10 border border-white/10" />
          </div>
        ))}
      </div>
    );
  }

  if (!homeReleases?.length) return null;

  return (
    <HomeReleasesDndList moduleId={moduleId} initialOrder={homeReleases.map((x) => x.homeItemId)}>
      {homeReleases.map((r) => (
        <HomeReleasesDndItem key={r.homeItemId} id={r.homeItemId}>
          <div className="flex items-center justify-between rounded-md bg-black/30 px-3 py-2">
            <div className="flex items-center gap-3 min-w-0">
              {r.cover_src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.cover_src}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-md object-cover border border-white/10"
                  loading="lazy"
                />
              ) : (
                <CoverPlaceholder size={56} />
              )}

              <div className="min-w-0">
                <div className="text-sm text-white truncate">{r.title ?? "Untitled"}</div>
                {r.artist_name ? (
                  <div className="text-xs text-white/60 truncate">{r.artist_name}</div>
                ) : null}
                <div className="text-xs text-[#B3B3B3]">{r.status ?? ""}</div>
              </div>
            </div>

            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(() => {
                  void onRemove(r.id);
                })
              }
              className={[
                "w-24 h-8 text-xs rounded-md flex items-center justify-center transition",
                "bg-red-500/10 text-red-300 hover:bg-red-500/20",
                pending ? "opacity-60 cursor-not-allowed" : "",
              ].join(" ")}
            >
              Remove
            </button>
          </div>
        </HomeReleasesDndItem>
      ))}
    </HomeReleasesDndList>
  );
}
