"use client";

import { useEffect, useState } from "react";
import PlaylistCard from "@/components/PlaylistCard";
import { createBrowserClient } from "@supabase/ssr";
import { usePlayer } from "@/context/PlayerContext";
import { getReleaseQueueForPlayer } from "@/lib/getReleaseQueue";
import { Play, Pause } from "lucide-react";

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

type FeaturedRelease = {
  id: string;
  title: string;
  cover_path: string | null;
  cover_url: string | null;
  status: string | null;
  artist_id: string | null;
  artist_name: string | null;
};

type Props = {
  home: {
    modules: HomeModule[];
    itemsByModuleId: Record<string, HomeItem[]>;
  };
  featuredRelease: FeaturedRelease | null;
};

export default function DashboardHomeClient({ home, featuredRelease }: Props) {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const { playQueue, togglePlay, pause, currentTrack, isPlaying } = usePlayer();
  const [isFeaturedLoading, setIsFeaturedLoading] = useState(false);
  const [featuredFirstTrackId, setFeaturedFirstTrackId] = useState<string | null>(null);

  const isFeaturedCurrent =
    !!featuredFirstTrackId && currentTrack?.id === featuredFirstTrackId;

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    async function loadPlaylists() {
      const { data } = await supabase
        .from("playlists")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      setPlaylists(data ?? []);
    }

    loadPlaylists();
  }, []);

  return (
    <div className="space-y-6">
      {featuredRelease && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6">
          <div className="text-xs uppercase tracking-wider text-white/50">
            Featured Release
          </div>

          <div className="mt-3 flex items-center gap-5">
            {featuredRelease.cover_url ? (
              <img
                src={featuredRelease.cover_url}
                alt={featuredRelease.title}
                className="h-24 w-24 md:h-28 md:w-28 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div className="h-24 w-24 md:h-28 md:w-28 shrink-0 rounded-xl bg-white/10" />
            )}

            <div className="min-w-0">
              <div className="text-2xl md:text-3xl font-semibold leading-tight truncate">
                {featuredRelease.title}
              </div>
              <div className="mt-1 text-white/60 truncate">
                {featuredRelease.artist_name ?? "Unknown Artist"}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  disabled={isFeaturedLoading}
                  onClick={async () => {
                    if (!featuredRelease) return;

                    if (isFeaturedCurrent) {
                      if (isPlaying) pause();
                      else togglePlay();
                      return;
                    }

                    try {
                      setIsFeaturedLoading(true);
                      const queue = await getReleaseQueueForPlayer(featuredRelease.id);
                      if (queue.length === 0) return;

                      setFeaturedFirstTrackId(queue[0].id);
                      playQueue(queue, 0);
                    } catch (e) {
                      const err = e as any;
                      console.error("Featured release play error:", err?.message ?? err);
                    } finally {
                      setIsFeaturedLoading(false);
                    }
                  }}
                  className="h-10 w-10 flex items-center justify-center rounded-full bg-white text-black hover:bg-white/90 disabled:opacity-60"
                >
                  {isFeaturedLoading ? (
                    <div className="h-4 w-4 animate-pulse rounded-sm bg-black/60" />
                  ) : isFeaturedCurrent && isPlaying ? (
                    <Pause size={18} />
                  ) : (
                    <Play size={18} />
                  )}
                </button>
                <button className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5">
                  Open
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <h2 className="text-xl font-semibold">Discover Playlists</h2>

      {playlists.length === 0 && (
        <p className="text-white/40">No public playlists available yet.</p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {playlists.map((pl) => (
          <PlaylistCard
            key={pl.id}
            id={pl.id}
            title={pl.title}
            description={pl.description}
            cover_url={pl.cover_url}
          />
        ))}
      </div>
    </div>
  );
}

