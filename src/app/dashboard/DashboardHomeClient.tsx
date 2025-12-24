// /Users/tonipetergugic/immusic/src/app/dashboard/DashboardHomeClient.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
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

type ReleaseCardData = {
  id: string;
  title: string;
  cover_url: string | null;
  artist_id: string | null;
  artist_name: string | null;
  release_type: string | null;
};

type Props = {
  home: {
    modules: HomeModule[];
    itemsByModuleId: Record<string, HomeItem[]>;
  };
};

export default function DashboardHomeClient({ home }: Props) {
  const [playlists, setPlaylists] = useState<any[]>([]);

  // Public playlists for "Discover Playlists"
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

  // Releases section (from home_modules + home_module_items)
  const releaseModule = home.modules.find((m) => m.module_type === "release") ?? null;
  const releaseItems = releaseModule ? home.itemsByModuleId[releaseModule.id] ?? [] : [];

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Releases</h2>

        {releaseItems.length === 0 ? (
          <p className="text-white/40">No releases configured for Home yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 items-start">
            {releaseItems
              .filter((it) => it.item_type === "release")
              .sort((a, b) => a.position - b.position)
              .slice(0, 10)
              .map((it) => (
                <ExtraReleaseCard key={it.id} releaseId={it.item_id} />
              ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
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
    </div>
  );
}

function ExtraReleaseCard({ releaseId }: { releaseId: string }) {
  const [data, setData] = useState<ReleaseCardData | null>(null);
  const { playQueue, togglePlay, pause, currentTrack, isPlaying } = usePlayer();
  const [isPlayLoading, setIsPlayLoading] = useState(false);
  const [firstTrackId, setFirstTrackId] = useState<string | null>(null);
  const router = useRouter();

  const isCurrent = !!firstTrackId && currentTrack?.id === firstTrackId;

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    (async () => {
      const { data: rel, error } = await supabase
        .from("releases")
        .select("id,title,cover_path,status,artist_id,release_type")
        .eq("id", releaseId)
        .single();

      if (error || !rel) return;

      let cover_url: string | null = null;
      if (rel.cover_path) {
        const { data: pub } = supabase.storage
          .from("release_covers")
          .getPublicUrl(rel.cover_path);
        cover_url = pub.publicUrl ?? null;
      }

      let artist_name: string | null = null;
      if (rel.artist_id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", rel.artist_id)
          .single();
        artist_name = prof?.display_name ?? null;
      }

      // Preload first track id for play/pause indicator
      try {
        const q = await getReleaseQueueForPlayer(releaseId);
        if (q[0]?.id) setFirstTrackId(q[0].id);
      } catch {
        // ignore
      }

      setData({
        id: rel.id,
        title: rel.title ?? "Untitled",
        cover_url,
        artist_id: rel.artist_id ?? null,
        artist_name,
        release_type: rel.release_type ?? null,
      });
    })();
  }, [releaseId]);

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
        p-3 rounded-xl 
        transition-all
        hover:scale-[1.02]
        hover:shadow-[0_0_14px_rgba(0,255,198,0.18)]
        border border-transparent
        hover:border-[#00FFC622]
        cursor-pointer
        block
        outline-none
      "
    >
      <div className="relative w-full aspect-square rounded-xl overflow-hidden">
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

        {/* Hover overlay */}
        <div className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors" />

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
          className="absolute inset-0 m-auto h-14 w-14 rounded-full bg-white text-black shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label={isCurrent && isPlaying ? "Stop release" : "Play release"}
        >
          {isPlayLoading ? (
            <div className="h-4 w-4 animate-pulse rounded-sm bg-black/60" />
          ) : isCurrent && isPlaying ? (
            <Pause size={22} />
          ) : (
            <Play size={22} />
          )}
        </button>
      </div>

      <h3 className="mt-3 text-sm font-semibold text-white/90 line-clamp-2 min-h-[2.5rem]">
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

      {data.release_type && (
        <div className="mt-1 text-[11px] uppercase tracking-wider text-white/35">
          {data.release_type}
        </div>
      )}
    </div>
  );
}

