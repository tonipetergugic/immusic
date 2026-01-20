"use client";

import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { addTrackToReleaseAction } from "./actions";

type ReleaseTrack = { track_id: string; track_title: string; position: number; release_id: string };

type AddTrackModalProps = {
  open: boolean;
  onClose: () => void;
  existingTrackIds: string[];
  releaseId: string;
  clientTracks: ReleaseTrack[];
  setClientTracks: Dispatch<SetStateAction<ReleaseTrack[]>>;
  onReleaseModified?: () => void;
};

export default function AddTrackModal({
  open,
  onClose,
  existingTrackIds,
  releaseId,
  clientTracks,
  setClientTracks,
  onReleaseModified,
}: AddTrackModalProps) {
  const supabase = createSupabaseBrowserClient();
  const [tracks, setTracks] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [trackIdsInAnyRelease, setTrackIdsInAnyRelease] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;

    let isCancelled = false;

    async function loadTracks() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.id) {
        if (!isCancelled) {
          setTracks([]);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("tracks")
        .select("id, title")
        .eq("artist_id", user.id)
        .order("created_at", { ascending: false });

      // Fetch track IDs that are already assigned to ANY release
      const { data: rtRows, error: rtErr } = await supabase
        .from("release_tracks")
        .select("track_id");

      if (!isCancelled) {
        setTracks(error ? [] : data || []);
        if (!rtErr && rtRows) {
          setTrackIdsInAnyRelease(new Set(rtRows.map((r) => String(r.track_id))));
        } else {
          // fallback: keep empty set if something fails (don't block UI)
          setTrackIdsInAnyRelease(new Set());
        }
        setLoading(false);
      }
    }

    loadTracks();

    return () => {
      isCancelled = true;
    };
  }, [open, supabase]);

  const blockedIds = useMemo(() => {
    if (!open) return new Set();
    const set = new Set(existingTrackIds);
    clientTracks.forEach((t) => set.add(t.track_id));
    return set;
  }, [open, existingTrackIds, clientTracks]);

  if (!open) return null;

  const filteredTracks = tracks?.filter((t) => !blockedIds.has(t.id)) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-md">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.06] p-6 text-white relative shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_24px_80px_rgba(0,0,0,0.55)]">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-200 text-sm"
        >
          ✕
        </button>

        <h2 className="text-lg font-semibold mb-4">Add Tracks</h2>

        {loading && <p className="text-sm text-gray-400">Loading tracks...</p>}

        {!loading && tracks?.length === 0 && (
          <p className="text-sm text-gray-400">You have no tracks yet.</p>
        )}

        {!loading && tracks && tracks.length > 0 && filteredTracks.length === 0 && (
          <p className="text-sm text-gray-400">
            No available tracks found.
          </p>
        )}

        {!loading && filteredTracks.length > 0 && (
          <ul className="space-y-2">
            {filteredTracks
              .filter((t) => !trackIdsInAnyRelease.has(String(t.id)))
              .map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm backdrop-blur-sm transition hover:bg-white/[0.07]"
              >
                <span>{t.title}</span>
                <button
                  onClick={async () => {
                    const result = await addTrackToReleaseAction(releaseId, t.id);

                    if (result?.error) {
                      alert("⚠️ This track already belongs to another release.");
                      return;
                    }

                    setClientTracks((prev) => {
                      const nextPosition = prev.length + 1;
                      return [
                        ...prev,
                        {
                          track_id: t.id,
                          track_title: t.title,
                          position: nextPosition,
                          release_id: releaseId,
                        },
                      ];
                    });
                    setTracks((prev) => prev?.filter((x) => x.id !== t.id) || []);
                    onReleaseModified?.();
                  }}
                  className="text-[#00FFC6] hover:text-[#00E0B0] text-xs font-semibold"
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

