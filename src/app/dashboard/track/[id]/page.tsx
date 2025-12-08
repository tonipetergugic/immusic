import { notFound } from "next/navigation";
import Image from "next/image";
import { Play, Pause } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toPlayerTrack } from "@/lib/playerTrack";
import { usePlayer } from "@/context/PlayerContext";
import type { PlayerTrack } from "@/types/playerTrack";

import PlayButton from "./PlayButton";

export default async function TrackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  // Load track with release and artist
  const { data: trackData } = await supabase
    .from("tracks")
    .select(
      `
        id,
        title,
        audio_path,
        artist_id,
        releases:releases!tracks_release_id_fkey(
          id,
          title,
          cover_path,
          status
        ),
        artist_profile:profiles!tracks_artist_id_fkey(
          display_name
        )
      `
    )
    .eq("id", id)
    .maybeSingle();

  // Normalize 1:1 relations (Supabase returns arrays for foreign keys)
  const trackDataNormalized = trackData
    ? {
        ...trackData,
        releases: Array.isArray(trackData.releases)
          ? trackData.releases[0] ?? null
          : trackData.releases ?? null,
        artist_profile: Array.isArray(trackData.artist_profile)
          ? trackData.artist_profile[0] ?? null
          : trackData.artist_profile ?? null,
      }
    : null;

  if (!trackDataNormalized) return notFound();

  const playerTrack = toPlayerTrack(trackDataNormalized);

  return (
    <div className="flex flex-col gap-10 pt-10 px-4 md:px-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* COVER */}
        {playerTrack.cover_url ? (
          <Image
            src={playerTrack.cover_url}
            alt={playerTrack.title}
            width={300}
            height={300}
            className="rounded-xl shadow-lg object-cover"
          />
        ) : (
          <div className="w-[300px] h-[300px] bg-neutral-800 rounded-xl" />
        )}

        {/* TITLE + ARTIST */}
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl md:text-6xl font-bold text-white">
            {playerTrack.title}
          </h1>

          <p className="text-lg text-white/70">
            {playerTrack.profiles?.display_name ?? "Unknown Artist"}
          </p>

          {trackDataNormalized.releases ? (
            <p className="text-sm text-white/40">
              From release: <span className="text-white">{trackDataNormalized.releases.title}</span>
            </p>
          ) : null}

          {/* PLAY BUTTON */}
          <div className="pt-4">
            <PlayButton track={playerTrack} />
          </div>
        </div>
      </div>

      {/* TRACK INFO */}
      <div className="text-white/70 text-sm flex flex-col gap-2">
        {playerTrack.bpm && <p>BPM: {playerTrack.bpm}</p>}
        {playerTrack.key && <p>Key: {playerTrack.key}</p>}
      </div>
    </div>
  );
}

