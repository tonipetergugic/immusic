"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { addTrackToReleaseAction } from "@/app/artist/releases/[id]/actions";

export default function AddTrackModal({
  releaseId,
  onClose,
  onTrackAdded,
}: {
  releaseId: string;
  onClose: () => void;
  onTrackAdded?: (track: any) => void;
}) {
  const [tracks, setTracks] = useState<any[]>([]);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);

    async function loadTracks() {
      const { data } = await supabase
        .from("tracks")
        .select("*")
        .eq("status", "approved");
      setTracks(data || []);
    }

    loadTracks();

    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, supabase]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#1A1A1D] p-6 rounded-xl border border-[#2A2A2D] w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-white">
          Add Track to Release
        </h2>

        <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
          {tracks.length === 0 && (
            <p className="text-[#B3B3B3]">No tracks found.</p>
          )}

          {tracks.map((track) => (
            <div
              key={track.id}
              onClick={async () => {
                await addTrackToReleaseAction(releaseId, track.id);

                if (onTrackAdded) {
                  const { data: releaseTrack } = await supabase
                    .from("release_tracks")
                    .select("*")
                    .eq("release_id", releaseId)
                    .eq("track_id", track.id)
                    .order("position", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                  if (releaseTrack) {
                    onTrackAdded({
                      id: releaseTrack.id,
                      track_id: releaseTrack.track_id,
                      release_id: releaseTrack.release_id,
                      position: releaseTrack.position,
                      tracks: track,
                    });
                  }
                }
                onClose();
              }}
              className="p-3 rounded-lg bg-[#1E1E20] border border-[#2A2A2D] cursor-pointer hover:border-[#00FFC6]"
            >
              <p className="text-white font-semibold">{track.title}</p>
              <p className="text-sm text-[#B3B3B3]">ID: {track.id}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#00FFC6] text-black font-semibold hover:bg-[#00E0B0]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

