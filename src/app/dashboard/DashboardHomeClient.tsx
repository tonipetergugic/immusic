// /Users/tonipetergugic/immusic/src/app/dashboard/DashboardHomeClient.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import PlaylistCard from "@/components/PlaylistCard";
import { usePlayer } from "@/context/PlayerContext";
import { getReleaseQueueForPlayer } from "@/lib/getReleaseQueue";
import { Play, Pause } from "lucide-react";
import type { HomeReleaseCard } from "@/lib/supabase/getHomeReleases";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type HomeModule = {
  id: string;
  title: string;
  module_type: "release" | "playlist" | "mixed";
  position: number;
};

type HomeItem = {
  id: string;
  module_id: string;
  item_type: "release" | "playlist";
  item_id: string;
  position: number;
};

type Props = {
  home: {
    modules: HomeModule[];
    itemsByModuleId: Record<string, HomeItem[]>;
  };
  releasesById: Record<string, HomeReleaseCard>;
};

export default function DashboardHomeClient({ home, releasesById }: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [featuredPlaylistsById, setFeaturedPlaylistsById] = useState<
    Record<string, { id: string; title: string; description: string | null; cover_url: string | null }>
  >({});
  // Releases section (from home_modules + home_module_items)
  const releaseModule = home.modules.find((m) => m.module_type === "release") ?? null;
  const releaseItems = releaseModule ? home.itemsByModuleId[releaseModule.id] ?? [] : [];
  const playlistModule =
    home.modules.find((m) => m.module_type === "playlist") ?? null;

  const playlistItems = playlistModule
    ? home.itemsByModuleId[playlistModule.id] ?? []
    : [];

  const playlistIds = useMemo(() => {
    return Array.from(
      new Set(
        playlistItems
          .filter((it) => it.item_type === "playlist")
          .sort((a, b) => a.position - b.position)
          .slice(0, 10)
          .map((it) => it.item_id)
      )
    );
  }, [playlistItems]);

  const playlistIdsKey = useMemo(() => playlistIds.join(","), [playlistIds]);

  useEffect(() => {
    if (playlistIds.length === 0) {
      setFeaturedPlaylistsById({});
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from("playlists")
        .select("id,title,description,cover_url")
        .in("id", playlistIds);

      if (error || !data) return;

      const map: Record<
        string,
        { id: string; title: string; description: string | null; cover_url: string | null }
      > = {};

      for (const p of data) {
        map[p.id] = {
          id: p.id,
          title: p.title,
          description: p.description ?? null,
          cover_url: p.cover_url ?? null,
        };
      }

      setFeaturedPlaylistsById(map);
    })();
  }, [playlistIdsKey, supabase]);

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          {releaseModule?.title ?? "Releases"}
        </h2>

        {releaseItems.length === 0 ? (
          <p className="text-white/40">No releases configured for Home yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 items-start">
            {releaseItems
              .filter((it) => it.item_type === "release")
              .sort((a, b) => a.position - b.position)
              .slice(0, 10)
              .map((it) => (
                <ExtraReleaseCard
                  key={it.id}
                  releaseId={it.item_id}
                  data={releasesById[it.item_id] ?? null}
                />
              ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          {playlistModule?.title ?? "Playlists"}
        </h2>

        {playlistItems.length === 0 ? (
          <p className="text-white/40">No playlists configured for Home yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {playlistItems
              .filter((it) => it.item_type === "playlist")
              .sort((a, b) => a.position - b.position)
              .slice(0, 10)
              .map((it) => {
                const pl = featuredPlaylistsById[it.item_id];

                if (!pl) {
                  return (
                    <div
                      key={it.id}
                      className="bg-[#111112] p-3 rounded-xl border border-transparent"
                    >
                      <div className="w-full aspect-square rounded-xl bg-white/10" />
                      <div className="mt-3 h-4 w-3/4 bg-white/10 rounded" />
                      <div className="mt-2 h-3 w-1/2 bg-white/10 rounded" />
                    </div>
                  );
                }

                return (
                  <PlaylistCard
                    key={it.id}
                    id={pl.id}
                    title={pl.title}
                    description={pl.description}
                    cover_url={pl.cover_url}
                  />
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

function ExtraReleaseCard({
  releaseId,
  data,
}: {
  releaseId: string;
  data: HomeReleaseCard | null;
}) {
  const { playQueue, togglePlay, pause, currentTrack, isPlaying } = usePlayer();
  const [isPlayLoading, setIsPlayLoading] = useState(false);
  const [firstTrackId, setFirstTrackId] = useState<string | null>(null);
  const router = useRouter();

  const isCurrent = !!firstTrackId && currentTrack?.id === firstTrackId;

  if (!data) {
    return (
      <div className="bg-[#111112] p-3 rounded-xl border border-transparent">
        <div className="w-full aspect-square rounded-xl bg-white/10" />
        <div className="mt-3 h-4 w-3/4 bg-white/10 rounded" />
        <div className="mt-2 h-3 w-1/2 bg-white/10 rounded" />
      </div>
    );
  }

  // NOTE: firstTrackId is set on first play click (no preload), to avoid N+1 queries.

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/dashboard/release/${data.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/dashboard/release/${data.id}`);
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
          <div className="pointer-events-none absolute top-2 right-2 z-10 rounded-md bg-black/65 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/90 border border-white/10 backdrop-blur">
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

        {/* Hover Play (unified with PlaylistCard) */}
        <div
          className="
            absolute inset-0 flex items-center justify-center
            opacity-0 group-hover:opacity-100
            transition-all duration-300
          "
        >
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();

              if (isCurrent) {
                if (isPlaying) pause();
                else togglePlay();
                return;
              }

              try {
                setIsPlayLoading(true);
                const queue = await getReleaseQueueForPlayer(releaseId);
                if (queue.length === 0) return;
                setFirstTrackId(queue[0].id);
                playQueue(queue, 0);
              } catch (err: any) {
                console.error("ExtraReleaseCard play error:", err?.message ?? err);
              } finally {
                setIsPlayLoading(false);
              }
            }}
            className="
              w-14 h-14 rounded-full
              bg-[#00FFC6] hover:bg-[#00E0B0]
              flex items-center justify-center
              shadow-[0_0_20px_rgba(0,255,198,0.40)]
              backdrop-blur-md
            "
            aria-label={isCurrent && isPlaying ? "Pause release" : "Play release"}
          >
            {isPlayLoading ? (
              <div className="h-4 w-4 animate-pulse rounded-sm bg-black/60" />
            ) : isCurrent && isPlaying ? (
              <Pause size={26} className="text-black" />
            ) : (
              <Play size={26} className="text-black" />
            )}
          </button>
        </div>
      </div>

      <h3 className="mt-2 text-sm font-semibold text-white/90 line-clamp-2 min-h-0">
        {data.title}
      </h3>

      {data.artist_id ? (
        <Link
          href={`/dashboard/artist/${data.artist_id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-white/50 truncate hover:text-[#00FFC6] transition-colors block"
        >
          {data.artist_name ?? "Unknown Artist"}
        </Link>
      ) : (
        <p className="text-xs text-white/50 truncate">
          {data.artist_name ?? "Unknown Artist"}
        </p>
      )}
    </div>
  );
}


