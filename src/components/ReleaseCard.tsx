"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { getArtistHref } from "@/lib/routes";

export type ReleaseCardData = {
  id: string;
  title: string;
  cover_url: string | null;
  release_type: string | null;
  artist_id: string | null;
  artist_name: string | null;
};

type ReleaseCardProps = {
  releaseId: string; // for dummy id & queue fetch
  data: ReleaseCardData | null;
  // optional: allow disabling navigation if ever needed
  href?: string;
};

async function fetchReleaseQueueForPlayer(releaseId: string) {
  const res = await fetch(`/api/releases/${releaseId}/queue`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to load release queue (${res.status})`);
  }

  const json = (await res.json()) as { queue?: any[] };
  return Array.isArray(json.queue) ? json.queue : [];
}

export default function ReleaseCard({ releaseId, data, href }: ReleaseCardProps) {
  const { currentTrack } = usePlayer();
  const [firstTrackId, setFirstTrackId] = useState<string | null>(null);
  const router = useRouter();

  const isCurrent = !!firstTrackId && currentTrack?.id === firstTrackId;

  const targetHref = href ?? (data?.id ? `/dashboard/release/${data.id}` : `/dashboard/release/${releaseId}`);

  if (!data) {
    return (
      <div className="rounded-2xl border border-transparent bg-[#111112] p-4">
        <div className="aspect-square w-full rounded-[18px] bg-white/10" />
        <div className="mt-3 h-4 w-3/4 rounded bg-white/10" />
        <div className="mt-2 h-3 w-1/2 rounded bg-white/10" />
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(targetHref)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(targetHref);
        }
      }}
      className="
        group relative
        block cursor-pointer
        rounded-2xl border border-transparent
        bg-[#111112]
        p-2.5
        outline-none
        transition-all
        hover:scale-[1.015]
        hover:border-[#00FFC622]
        hover:shadow-[0_0_14px_rgba(0,255,198,0.18)]
        focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60
        focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E0E10]
      "
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-[18px]">
        {/* Release type badge (top-right) */}
        {data.release_type && (
          <div className="pointer-events-none absolute top-2 right-2 z-10 rounded-md border border-white/10 bg-black/65 px-2 py-[3px] text-[9px] font-semibold uppercase tracking-wider text-white/90 backdrop-blur">
            {data.release_type}
          </div>
        )}

        {data.cover_url ? (
          <Image
            src={data.cover_url}
            alt={data.title}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            priority
            className="
              object-cover rounded-[18px]
              transition-all duration-300
              group-hover:brightness-110
              group-hover:shadow-[0_0_25px_rgba(0,255,198,0.12)]
            "
          />
        ) : (
          <div className="w-full h-full bg-neutral-800 rounded-xl" />
        )}

      </div>

      <h3
        className="mt-3 text-[13px] font-semibold leading-5 text-white/90 truncate"
        title={data.title}
      >
        {data.title}
      </h3>

      {data.artist_id ? (
        <Link
          href={getArtistHref(data.artist_id)}
          onClick={(e) => e.stopPropagation()}
          className="block truncate text-[11px] text-white/55 transition-colors hover:text-[#00FFC6]"
        >
          {data.artist_name ?? "Unknown Artist"}
        </Link>
      ) : (
        <p className="truncate text-[11px] text-white/55">
          {data.artist_name ?? "Unknown Artist"}
        </p>
      )}
    </div>
  );
}
