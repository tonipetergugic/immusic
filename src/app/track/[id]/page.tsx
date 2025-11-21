import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Image from "next/image";
import PlayOverlayButton from "@/components/PlayOverlayButton";

export const metadata: Metadata = {
  title: "Track – ImMusic",
};

export default async function TrackPage({
  params,
}: {
  params: { id: string };
}) {
  // !!! WICHTIG → Supabase Server Client async !!!
  const supabase = await createSupabaseServerClient();

  const { id } = params;

  // === TRACK LADEN ===
  const { data: track, error: trackError } = await supabase
    .from("tracks")
    .select("*")
    .eq("id", id)
    .single();

  if (trackError || !track) {
    return (
      <main className="min-h-screen bg-[#0E0E10] text-white p-8">
        <p className="text-red-500">Track not found.</p>
      </main>
    );
  }

  // === ARTIST LADEN ===
  const { data: artist } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", track.artist_id)
    .single();

  const artistName = artist?.display_name ?? "Unknown Artist";

  return (
    <main className="min-h-screen bg-[#0E0E10] text-white px-6 py-10">
      <div className="mx-auto max-w-5xl">
        {/* HEADER */}
        <section className="flex flex-col md:flex-row gap-8 md:items-center">

          {/* COVER + PLAY */}
          <div className="relative group w-[240px] h-[240px] rounded-xl overflow-hidden shadow-xl">
            {track.cover_url ? (
              <Image
                src={track.cover_url}
                alt={track.title}
                width={240}
                height={240}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-sm opacity-70">
                No cover
              </div>
            )}

            {/* Overlay Play Button */}
            <PlayOverlayButton track={track} />
          </div>

          {/* INFO-BEREICH */}
          <div className="flex flex-col gap-3">
            <span className="text-xs uppercase tracking-wider text-gray-400">
              TRACK
            </span>

            <h1 className="text-4xl font-semibold">{track.title}</h1>

            <p className="text-gray-300 text-sm">by {artistName}</p>

            <div className="flex gap-3 mt-2 text-xs text-gray-400">
              {track.bpm && (
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10">
                  {track.bpm} BPM
                </span>
              )}
              {track.key && (
                <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10">
                  Key: {track.key}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* PLAYER / RATINGS / AI */}
        <section className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl bg-white/5 border border-white/10 p-5">
            <h2 className="text-lg font-medium mb-1">Player</h2>
            <p className="text-sm text-gray-400">
              The global ImMusic player will be connected here later.
            </p>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-5">
            <h2 className="text-lg font-medium mb-1">Ratings</h2>
            <p className="text-sm text-gray-400">
              Placeholder for listener ratings and reviews.
            </p>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-5 md:col-span-2">
            <h2 className="text-lg font-medium mb-1">AI Insights</h2>
            <p className="text-sm text-gray-400">
              Placeholder for AI-based track analysis and recommendations.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
