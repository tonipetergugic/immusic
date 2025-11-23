import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ArtistTrackList from "@/components/ArtistTrackList";

type ArtistPageProps = {
  params: { id: string };
};

export default async function ArtistPage({ params }: ArtistPageProps) {
  const supabase = await createSupabaseServerClient();

  // Artist laden
  const { data: artist } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", params.id)
    .single();

  if (!artist) {
    return <p className="p-6 text-white">Artist not found.</p>;
  }

  // Tracks laden
  const { data: tracks } = await supabase
    .from("tracks")
    .select(`
      id,
      title,
      cover_url,
      audio_url,
      created_at,
      bpm,
      key,
      artist_id,
      profiles:profiles!tracks_artist_id_fkey(display_name)
    `)
    .eq("artist_id", artist.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col">
      {/* HERO SECTION – Apple Music Style */}
      <div className="relative w-full h-[220px] md:h-[260px] lg:h-[300px] mb-4 overflow-hidden">

        {/* Blurred Background (Falls Avatar vorhanden) */}
        {artist.avatar_url ? (
          <Image
            src={artist.avatar_url}
            alt={artist.display_name || "Artist"}
            fill
            className="object-cover blur-3xl scale-125 opacity-35"
          />
        ) : (
          // Fallback Hintergrund ohne Avatar
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f0f] to-[#050505]" />
        )}

        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b 
          from-black/20 
          via-black/70 
          to-black
        " />

        {/* Foreground: Avatar + Name */}
        <div className="absolute bottom-2 left-6 md:left-12 flex items-end gap-10">

          {/* Großer Avatar (oder Fallback) */}
          <div className="relative w-44 h-44 md:w-52 md:h-52 lg:w-60 lg:h-60 rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-neutral-900">
            {artist.avatar_url ? (
              <Image
                src={artist.avatar_url}
                alt={artist.display_name || "Artist"}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-neutral-800" />
            )}
          </div>

          {/* Artist Name */}
          <h1 className="text-white font-bold 
            text-5xl md:text-6xl lg:text-7xl 
            leading-none drop-shadow-xl
          ">
            {artist.display_name}
          </h1>
        </div>
      </div>

      {/* TRACK GRID */}
      <div className="px-6 -mt-4">
        <h2 className="text-xl font-semibold text-white mb-4">
          Tracks
        </h2>

        <ArtistTrackList
          tracks={tracks ?? []}
          artistName={artist.display_name}
        />
      </div>
    </div>
  );
}
