"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import ReleaseCoverUploader from "./ReleaseCoverUploader";
import TrackListSortable from "./TrackListSortable";
import AddTrackModal from "./AddTrackModal";
import { updateReleaseTitleAction } from "./updateReleaseTitleAction";
import { updateReleaseTypeAction } from "./updateReleaseTypeAction";
import { publishReleaseAction } from "./publishReleaseAction";
import { updateReleaseStatusAction } from "./updateReleaseStatusAction";
import DeleteReleaseModal from "@/components/DeleteReleaseModal";
import { deleteReleaseAction } from "./deleteReleaseAction";

type Track = { track_id: string; track_title: string; position: number; release_id: string };
type ReleaseStatus = "draft" | "published";
type ReleaseData = {
  title: string;
  release_type: string;
  created_at: string;
  updated_at?: string;
  status?: ReleaseStatus;
};

type ReleaseEditorClientProps = {
  releaseId: string;
  initialTracks: Track[];
  existingTrackIds: string[];
  releaseData: ReleaseData;
  coverUrl: string | null;
  allTracksMetadataComplete: boolean;
  eligibilityByTrackId?: Record<
    string,
    { is_development: boolean; exposure_completed: boolean; rating_count: number }
  >;
};

export default function ReleaseEditorClient({
  releaseId,
  initialTracks,
  existingTrackIds,
  releaseData,
  coverUrl,
  allTracksMetadataComplete,
  eligibilityByTrackId,
}: ReleaseEditorClientProps) {
  const [tracks, setTracks] = useState<Track[]>(initialTracks ?? []);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState(releaseData.title);
  const [releaseType, setReleaseType] = useState(releaseData.release_type);
  const [status, setStatus] = useState<ReleaseStatus>(releaseData.status ?? "draft");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const markAsDraft = useCallback(() => {
    setStatus("draft");
    startTransition(async () => {
      await updateReleaseStatusAction(releaseId, "draft");
    });
  }, [releaseId, startTransition]);

  const derivedTrackIds = useMemo(() => {
    if (tracks.length > 0) {
      return tracks.map((t) => t.track_id);
    }
    return existingTrackIds;
  }, [tracks, existingTrackIds]);

  const hasCover = Boolean(coverUrl);
  const hasAtLeastOneTrack = tracks.length > 0;

  return (
    <div className="w-full max-w-[1600px] mx-auto text-white px-6 py-6 lg:px-10 lg:py-8 pb-40 lg:pb-48">
      <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
        {/* Left column: Cover + Actions */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-[0.12em] text-white/60">
                  Release
                </div>
                <div className="mt-1 text-sm font-semibold text-white/90">
                  {status === "published" ? "Published" : "Draft"}
                </div>
                {status === "published" ? (
                  <div className="mt-1 text-xs text-white/60">
                    Status: Published — visible on ImMusic
                  </div>
                ) : null}
              </div>

              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur
        ${
          status === "published"
            ? "border-[#00FFC6]/40 bg-[#00FFC6]/10 text-[#00FFC6]"
            : "border-white/15 bg-black/20 text-white/70"
        }`}
              >
                {status === "published" ? "Live" : "Ready"}
              </span>
            </div>

            <div className="mt-4">
              <ReleaseCoverUploader
                releaseId={releaseId}
                initialCoverUrl={coverUrl}
                onReleaseModified={markAsDraft}
              />
            </div>

            {status === "draft" &&
              releaseData.updated_at &&
              releaseData.created_at !== releaseData.updated_at && (
              <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
                This release has been modified. Re-publish to make changes public.
              </div>
              )}

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="text-xs uppercase tracking-[0.12em] text-white/60">
                Pre-Publish Checklist
              </div>

              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/80">Cover added</span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                      hasCover
                        ? "border-[#00FFC6]/30 bg-[#00FFC6]/10 text-[#00FFC6]"
                        : "border-white/15 bg-black/20 text-white/60"
                    }`}
                  >
                    {hasCover ? "Ready" : "Missing"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/80">At least 1 track</span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                      hasAtLeastOneTrack
                        ? "border-[#00FFC6]/30 bg-[#00FFC6]/10 text-[#00FFC6]"
                        : "border-white/15 bg-black/20 text-white/60"
                    }`}
                  >
                    {hasAtLeastOneTrack ? "Ready" : "Missing"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-white/80">Track metadata complete</span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                      allTracksMetadataComplete
                        ? "border-[#00FFC6]/30 bg-[#00FFC6]/10 text-[#00FFC6]"
                        : "border-white/15 bg-black/20 text-white/60"
                    }`}
                  >
                    {allTracksMetadataComplete ? "Ready" : "Missing"}
                  </span>
                </div>
              </div>

              {!allTracksMetadataComplete && hasAtLeastOneTrack ? (
                <div className="mt-3 text-xs text-white/60">
                  Tip: Open <span className="text-white/80">My Tracks</span> and complete BPM, key, genre, lyrics flag, and explicit flag.
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={() => {
                  startTransition(async () => {
                    const res = await publishReleaseAction(releaseId);
                    if (res?.success) {
                      setStatus("published");
                    } else {
                      alert(res?.error ?? "Failed to publish.");
                    }
                  });
                }}
                disabled={status === "published"}
                className="w-full inline-flex items-center justify-center rounded-xl bg-white/[0.06] border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/[0.10] hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60"
              >
                {status === "published" ? "Published" : "Publish Release"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="text-xs uppercase tracking-[0.12em] text-white/60">
              Danger Zone
            </div>
            <div className="mt-1 text-sm text-[#B3B3B3]">
              Delete this release permanently.
            </div>

            <button
              onClick={() => setDeleteModalOpen(true)}
              className="mt-4 w-full inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-red-200/90 transition hover:bg-red-500/10 hover:border-red-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
              type="button"
            >
              Delete Release
            </button>
          </div>
        </div>

        {/* Right column: Title / Meta / Tracks */}
        <div className="min-w-0">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <input
              className="w-full bg-transparent text-3xl font-semibold tracking-tight outline-none border-b border-white/10 focus:border-[#00FFC6]/60 transition pb-3"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                const trimmed = title.trim();
                if (trimmed !== releaseData.title) {
                  startTransition(async () => {
                    const result = await updateReleaseTitleAction(releaseId, trimmed);
                    if (!result?.error) {
                      markAsDraft();
                    }
                  });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              aria-busy={isPending}
            />

            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[#B3B3B3]">
              <select
                className="uppercase tracking-[0.14em] text-[#00FFC6] bg-transparent border-none p-0 outline-none cursor-pointer hover:text-[#00E0B0] transition font-medium"
                value={releaseType}
                onChange={(e) => {
                  const nextType = e.target.value;
                  setReleaseType(nextType);

                  if (nextType !== releaseData.release_type) {
                    startTransition(async () => {
                      const result = await updateReleaseTypeAction(releaseId, nextType);
                      if (!result?.error) {
                        markAsDraft();
                      }
                    });
                  }
                }}
              >
                <option value="single">SINGLE</option>
                <option value="ep">EP</option>
                <option value="album">ALBUM</option>
              </select>

              <span className="text-white/30">•</span>

              <div className="text-sm text-[#B3B3B3]">
                <span className="text-white/60">Created</span>{" "}
                {(() => {
                  const d = new Date(releaseData.created_at);
                  const formatted =
                    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ` +
                    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                  return formatted;
                })()}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Tracklist</h2>
                <div className="mt-1 text-sm text-[#B3B3B3]">{tracks.length} tracks</div>
              </div>

              <button
                onClick={() => setModalOpen(true)}
                className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm font-semibold text-white/90 backdrop-blur transition hover:bg-white/[0.06] hover:border-[#00FFC6]/60 hover:shadow-[0_0_0_1px_rgba(0,255,198,0.25),0_20px_60px_rgba(0,255,198,0.15)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60"
                type="button"
              >
                <span className="text-white/70 group-hover:text-[#00FFC6] transition">+</span>
                <span className="tracking-tight">Add Tracks</span>
              </button>
            </div>

            <div className="px-2 sm:px-4 py-3">
              {tracks.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
                  <div className="text-xs uppercase tracking-[0.12em] text-white/60">
                    Tracklist
                  </div>
                  <div className="mt-2 text-base font-semibold text-white/90">
                    No tracks yet
                  </div>
                  <div className="mt-1 text-sm text-[#B3B3B3]">
                    Add tracks to build your release.
                  </div>

                  <div className="mt-5 inline-flex items-center gap-2 text-sm text-white/70">
                    <span className="text-[#00FFC6]">Tip:</span>
                    Use “Add Tracks” in the top-right.
                  </div>
                </div>
              ) : (
                <TrackListSortable
                  releaseId={releaseId}
                  tracks={tracks}
                  setTracks={setTracks}
                  onReleaseModified={markAsDraft}
                  eligibilityByTrackId={eligibilityByTrackId}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <AddTrackModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        existingTrackIds={derivedTrackIds}
        releaseId={releaseId}
        clientTracks={tracks}
        setClientTracks={setTracks}
        onReleaseModified={markAsDraft}
      />

      <DeleteReleaseModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => {
          // directly call the server action
          deleteReleaseAction(releaseId);
        }}
      />
    </div>
  );
}

