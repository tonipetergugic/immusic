"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import PlayOverlayButton from "@/components/PlayOverlayButton";

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
      <div className="bg-[#111112] p-3 rounded-xl border border-transparent">
        <div className="w-full aspect-square rounded-xl bg-white/10" />
        <div className="mt-3 h-4 w-3/4 bg-white/10 rounded" />
        <div className="mt-2 h-3 w-1/2 bg-white/10 rounded" />
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
        bg-[#111112] 
        p-2 rounded-xl
        transition-all
        hover:scale-[1.015]
        hover:shadow-[0_0_14px_rgba(0,255,198,0.18)]
        border border-transparent
        hover:border-[#00FFC622]
        cursor-pointer
        block
        outline-none
      "
    >
      <div className="relative w-full aspect-square rounded-xl overflow-hidden">
        {/* Release type badge (top-right) */}
        {data.release_type && (
          <div className="pointer-events-none absolute top-2 right-2 z-10 rounded-md bg-black/65 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/90 border border-white/10 backdrop-blur">
            {data.release_type}
          </div>
        )}

        {data.cover_url ? (
          <Image
            src={data.cover_url}
            alt={data.title}
            fill
            className="
              object-cover rounded-xl
              transition-all duration-300
              group-hover:brightness-110
              group-hover:shadow-[0_0_25px_rgba(0,255,198,0.12)]
            "
          />
        ) : (
          <div className="w-full h-full bg-neutral-800 rounded-xl" />
        )}

        {/* Hover Play (standardized) */}
        <PlayOverlayButton
          size="lg"
          // dummy track object; we only need an id for current matching
          track={{ id: firstTrackId ?? releaseId } as any}
          currentTrackId={isCurrent ? (firstTrackId ?? undefined) : undefined}
          getQueue={async () => {
            const queue = await fetchReleaseQueueForPlayer(releaseId);
            if (!Array.isArray(queue) || queue.length === 0) return { tracks: [], index: 0 };
            setFirstTrackId(queue[0].id);
            return { tracks: queue as any, index: 0 };
          }}
        />
      </div>

      <h3 className="mt-2 text-[13px] font-semibold text-white/90 line-clamp-2 min-h-0">
        {data.title}
      </h3>

      {data.artist_id ? (
        <Link
          href={`/dashboard/artist/${data.artist_id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-[11px] text-white/50 truncate hover:text-[#00FFC6] transition-colors block"
        >
          {data.artist_name ?? "Unknown Artist"}
        </Link>
      ) : (
        <p className="text-[11px] text-white/50 truncate">
          {data.artist_name ?? "Unknown Artist"}
        </p>
      )}
    </div>
  );
}
