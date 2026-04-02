"use client";

import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { addTrackToReleaseAction } from "./actions";

function showNotice(message: string) {
  window.dispatchEvent(
    new CustomEvent("immusic:notice", { detail: { message } })
  );
}

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
  const router = useRouter();
  const [tracks, setTracks] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [addingTrackId, setAddingTrackId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;

    setQuery("");

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

      if (!isCancelled) {
        setTracks(error ? [] : data || []);
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

  const matchingTracks = useMemo(() => {
    const base = (tracks ?? []).filter((t) => !blockedIds.has(t.id));
    const q = query.trim().toLowerCase();

    return !q
      ? base
      : base.filter((t) => String(t.title ?? "").toLowerCase().includes(q));
  }, [tracks, blockedIds, query]);

  const filteredTracks = useMemo(() => {
    return matchingTracks.slice(0, 12);
  }, [matchingTracks]);

  if (!open) return null;

  const shouldShowLimitedNote = matchingTracks.length > 12;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-md"
      onClick={() => {
        if (addingTrackId) return;
        onClose();
      }}
    >
      <div
        className="relative flex h-[640px] w-full max-w-md flex-col rounded-2xl border border-white/10 bg-white/[0.06] p-6 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_24px_80px_rgba(0,0,0,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => {
            if (addingTrackId) return;
            onClose();
          }}
          disabled={Boolean(addingTrackId)}
          className="absolute top-3 right-3 cursor-pointer text-sm text-gray-400 hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ✕
        </button>

        <h2 className="mb-4 text-lg font-semibold">Add Tracks</h2>

        <div className="flex flex-1 min-h-0 flex-col">

        {loading && <p className="text-sm text-gray-400">Loading tracks...</p>}

        {!loading && tracks?.length === 0 && (
          <p className="text-sm text-gray-400">You have no tracks yet.</p>
        )}

        {!loading && tracks && tracks.length > 0 && filteredTracks.length === 0 && (
          <p className="text-sm text-gray-400">
            {query.trim() ? "No matching tracks found." : "No available tracks found."}
          </p>
        )}

        {!loading && tracks && tracks.length > 0 ? (
          <div className="mb-4">
            <div className="flex items-center gap-3 border-b border-white/15 pb-2 transition focus-within:border-[#00FFC6]/40">
              <Search className="h-4 w-4 text-white/45" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tracks..."
                className="w-full bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
              />
            </div>
          </div>
        ) : null}

        {!loading && filteredTracks.length > 0 && (
          <>
            <ul className="h-[416px] space-y-2 overflow-y-auto pr-1">
              {filteredTracks.map((t) => (
                <li
                  key={t.id}
                  onClick={async () => {
                    if (addingTrackId !== null) return;

                    setAddingTrackId(t.id);

                    try {
                      const result = await addTrackToReleaseAction(releaseId, t.id);

                      if (result?.error) {
                        showNotice(result.error);
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
                      router.refresh();
                    } finally {
                      setAddingTrackId(null);
                    }
                  }}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm backdrop-blur-sm transition hover:bg-white/[0.07]"
                >
                  <span>{t.title}</span>

                  <span
                    className={`text-xs font-semibold ${
                      addingTrackId === t.id ? "text-white/50" : "text-[#00FFC6]"
                    }`}
                  >
                    {addingTrackId === t.id ? "Adding..." : "+ Add"}
                  </span>
                </li>
              ))}
            </ul>

            {shouldShowLimitedNote ? (
              <p className="mt-3 text-xs text-white/45">Showing the 12 most recent matching tracks.</p>
            ) : null}
          </>
        )}
        </div>
      </div>
    </div>
  );
}

