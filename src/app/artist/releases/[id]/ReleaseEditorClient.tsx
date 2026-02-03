"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import BackLink from "@/components/BackLink";
import ReleaseCoverUploader from "./ReleaseCoverUploader";
const TrackListSortable = dynamic(() => import("./TrackListSortable"), {
  ssr: false,
});
import AddTrackModal from "./AddTrackModal";
import { updateReleaseTitleAction } from "./updateReleaseTitleAction";
import { updateReleaseTypeAction } from "./updateReleaseTypeAction";
import { publishReleaseAction } from "./publishReleaseAction";
import { updateReleaseStatusAction } from "./updateReleaseStatusAction";
import { toggleReleaseVisibilityAction } from "./toggleReleaseVisibilityAction";
import DeleteReleaseModal from "@/components/DeleteReleaseModal";
import { deleteReleaseAction } from "./deleteReleaseAction";
import { enableDevelopmentForReleaseAction } from "./enableDevelopmentForReleaseAction";

type Track = { track_id: string; track_title: string; position: number; release_id: string };
type ReleaseStatus = "draft" | "published" | "withdrawn";
type ReleaseData = {
  title: string;
  release_type: string;
  created_at: string;
  updated_at?: string;
  status?: ReleaseStatus;
  published_at?: string | null;
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
  premiumBalance: number;
  trackStatusById: Record<string, string>;
  boostEnabledById: Record<string, boolean>;
};

export default function ReleaseEditorClient({
  releaseId,
  initialTracks,
  existingTrackIds,
  releaseData,
  coverUrl,
  allTracksMetadataComplete,
  eligibilityByTrackId,
  premiumBalance,
  trackStatusById,
  boostEnabledById,
}: ReleaseEditorClientProps) {
  const [tracks, setTracks] = useState<Track[]>(initialTracks ?? []);
  const hasAtLeastOneTrack = tracks.length > 0;
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState(releaseData.title);
  const [releaseType, setReleaseType] = useState(releaseData.release_type);
  const [status, setStatus] = useState<ReleaseStatus>(releaseData.status ?? "draft");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [visibilityModalOpen, setVisibilityModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [devAllPending, setDevAllPending] = useState(false);
  const allTracksInDevelopment =
    initialTracks.length > 0 &&
    initialTracks.every((t) => trackStatusById[t.track_id] === "development");
  const [devAllDone, setDevAllDone] = useState(allTracksInDevelopment);
  const isPublished = status === "published";
  const isWithdrawn = status === "withdrawn";
  const hasBeenPublished = Boolean(releaseData.published_at);
  const hasCover = Boolean(coverUrl);

  // Publish Preconditions (verbindlich)
  // IMPORTANT: only Draft can be published (Withdrawn must NOT enable republish)
  const canPublish =
    status === "draft" && hasCover && hasAtLeastOneTrack && allTracksMetadataComplete;

  const markAsDraft = useCallback(() => {
    // Published releases are immutable (DB-enforced). Never attempt draft transitions.
    if (status === "published") return;

    startTransition(async () => {
      const res = await updateReleaseStatusAction(releaseId, "draft");
      if (res?.success) {
        setStatus("draft");
      } else if (res?.error) {
        alert(res.error);
      }
    });
  }, [releaseId, startTransition, status]);

  const derivedTrackIds = useMemo(() => {
    if (tracks.length > 0) {
      return tracks.map((t) => t.track_id);
    }
    return existingTrackIds;
  }, [tracks, existingTrackIds]);

  const confirmPublish = useCallback(() => {
    if (!canPublish) return;

    startTransition(async () => {
      const res = await publishReleaseAction(releaseId);
      if (res?.success) {
        setStatus("published");
        setPublishModalOpen(false);
      } else {
        alert(res?.error ?? "Failed to publish.");
      }
    });
  }, [canPublish, releaseId, startTransition]);

  const confirmToggleVisibility = useCallback(() => {
    if (status !== "published" && status !== "withdrawn") return;

    startTransition(async () => {
      const res = await toggleReleaseVisibilityAction(releaseId);
      if (res?.ok && res.status) {
        setStatus(res.status as ReleaseStatus);
        setVisibilityModalOpen(false);
      } else if (res?.error) {
        alert(res.error);
      } else {
        alert("Failed to update release status.");
      }
    });
  }, [releaseId, startTransition, status]);

  return (
    <div className="w-full max-w-[1600px] mx-auto text-white px-6 py-6 lg:px-10 lg:py-8 pb-40 lg:pb-48">
      <div className="mb-6">
        <BackLink label="Back to Releases" href="/artist/releases" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
        {/* Left column: Lifecycle / control (no cards, minimalist flow) */}
        <div className="space-y-10">
          {/* Status */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.12em] text-white/60">
                  Release
                </div>
                <div className="mt-1 text-lg font-semibold tracking-tight text-white">
                  {status === "published"
                    ? "Published"
                    : status === "withdrawn"
                    ? "Withdrawn"
                    : "Draft"}
                </div>
                {status === "published" ? (
                  <div className="mt-1 text-xs text-white/60">
                    Status: Published — live on ImMusic
                  </div>
                ) : status === "withdrawn" ? (
                  <div className="mt-1 text-xs text-white/60">
                    Status: Withdrawn — private edit mode (release remains live)
                  </div>
                ) : null}
              </div>

              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur ${
                  status === "published"
                    ? "border-[#00FFC6]/40 bg-[#00FFC6]/10 text-[#00FFC6]"
                    : "border-white/15 bg-black/20 text-white/70"
                }`}
              >
                {status === "draft" ? "Ready" : "Live"}
              </span>
            </div>

            <div className="mt-4">
              <div
                className={[
                  "mx-auto",
                  "w-full",
                  "max-w-[320px]",
                  "aspect-square",
                  isPublished ? "pointer-events-none opacity-60" : "",
                ].join(" ")}
              >
                <ReleaseCoverUploader
                  releaseId={releaseId}
                  initialCoverUrl={coverUrl}
                  onReleaseModified={status === "draft" ? markAsDraft : undefined}
                />
              </div>

              {isPublished ? (
                <div className="mt-2 text-xs text-white/60">
                  Cover is locked because this release is published.
                </div>
              ) : null}
            </div>

            {status === "draft" &&
              releaseData.updated_at &&
              releaseData.created_at !== releaseData.updated_at && (
              <div className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-200">
                This release has been modified. Re-publish to make changes public.
              </div>
            )}
          </div>

          {/* Pre-Publish Checklist */}
            <div>
              <div className="text-sm font-semibold tracking-tight text-white">
                Pre-Publish Checklist
              </div>

            <div className="mt-3 space-y-2 text-[13px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-white/70">Cover added</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[72px] rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                    hasCover
                      ? "border-[#00FFC6]/30 bg-[#00FFC6]/10 text-[#00FFC6]"
                      : "border-white/15 bg-black/20 text-white/60"
                  }`}
                >
                  {hasCover ? "Ready" : "Missing"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-white/70">At least 1 track</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[72px] rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                    hasAtLeastOneTrack
                      ? "border-[#00FFC6]/30 bg-[#00FFC6]/10 text-[#00FFC6]"
                      : "border-white/15 bg-black/20 text-white/60"
                  }`}
                >
                  {hasAtLeastOneTrack ? "Ready" : "Missing"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-white/70">Track metadata complete</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[72px] rounded-full border px-2.5 py-1 text-[11px] font-medium ${
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
              <div className="mt-3 text-xs text-white/65">
                Tip: Open <span className="text-white/80">My Tracks</span> and complete BPM, key, genre, lyrics flag, and explicit flag.
              </div>
            ) : null}

            {isPublished ? (
              <div className="mt-6 space-y-3">
                <div className="text-sm font-semibold text-white/90">
                  Development Discovery
                </div>

                <div className="text-sm text-white/70">
                  Enable Development for all tracks in this release. This can only be done once.
                </div>

                <button
                  type="button"
                  disabled={devAllPending || devAllDone || allTracksInDevelopment}
                  onClick={() => {
                    if (devAllPending || devAllDone || allTracksInDevelopment) return;

                    setDevAllPending(true);
                    startTransition(async () => {
                      try {
                        const res = await enableDevelopmentForReleaseAction(releaseId);
                        if (res?.success) {
                          setDevAllDone(true);
                          window.location.reload();
                        } else {
                          alert(res?.error ?? "Failed to enable development.");
                        }
                      } finally {
                        setDevAllPending(false);
                      }
                    });
                  }}
                  className="w-full rounded-xl border border-[#00FFC6]/30 bg-[#00FFC6]/15 px-5 py-3 text-sm font-semibold text-[#00FFC6] backdrop-blur transition
      hover:bg-[#00FFC6]/25 hover:border-[#00FFC6]/50
      hover:shadow-[0_0_0_1px_rgba(0,255,198,0.25),0_12px_40px_rgba(0,255,198,0.18)]
      focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/40
      disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {allTracksInDevelopment
                    ? "All tracks already in Development"
                    : devAllDone
                    ? "Development enabled"
                    : devAllPending
                    ? "Enabling..."
                    : "Enable Development for all tracks"}
                </button>

                {(devAllDone || allTracksInDevelopment) ? (
                  <div className="text-xs text-white/60">
                    Done. Track statuses will update automatically.
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-5 flex flex-col gap-2">
              {!hasBeenPublished && releaseData.status === "draft" && (
                <button
                  onClick={() => {
                    if (!canPublish) return;
                    setPublishModalOpen(true);
                  }}
                  disabled={!canPublish}
                  className="w-full inline-flex items-center justify-center rounded-xl
  border border-[#00FFC6]/40
  bg-[#00FFC6]/15
  px-4 py-3
  text-sm font-semibold text-[#00FFC6]
  transition
  hover:bg-[#00FFC6]/25 hover:border-[#00FFC6]/60
  hover:shadow-[0_0_0_1px_rgba(0,255,198,0.25),0_12px_40px_rgba(0,255,198,0.18)]
  focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60
  disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Publish Release
                </button>
              )}

              {status === "published" && (
                <button
                  type="button"
                  onClick={() => setVisibilityModalOpen(true)}
                  className="w-full inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/[0.06] hover:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                >
                  Withdraw Release
                </button>
              )}

              {status === "withdrawn" && (
                <button
                  type="button"
                  onClick={() => setVisibilityModalOpen(true)}
                  className="w-full inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/[0.06] hover:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                >
                  Activate Release
                </button>
              )}
            </div>
          </div>

          {!isPublished && (
            <>
              {/* Danger Zone */}
              <div className="rounded-2xl border border-red-500/25 bg-red-500/5 px-4 py-4">
                <div className="text-sm font-semibold tracking-tight text-white">
                  Danger Zone
                </div>

                <div className="mt-1 text-sm text-white/70">
                  Delete this release permanently.
                </div>

                <button
                  onClick={() => {
                    if (!(releaseData.status === "draft" || isWithdrawn)) return;
                    setDeleteModalOpen(true);
                  }}
                  disabled={!(releaseData.status === "draft" || isWithdrawn)}
                  className="mt-4 w-full inline-flex items-center justify-center rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 hover:border-red-500/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                >
                  Delete Release
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right column: Title / Meta / Tracks */}
        <div className="min-w-0">
          <div>
            <input
              className="w-full bg-transparent text-3xl font-semibold tracking-tight outline-none border-b border-white/10 focus:border-[#00FFC6]/60 transition pb-3 disabled:opacity-60 disabled:cursor-not-allowed"
              value={title}
              disabled={isPublished || isPending}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                if (isPublished) return;

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
              aria-disabled={isPublished || isPending}
            />

            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[#B3B3B3]">
              <select
                className="uppercase tracking-[0.14em] text-[#00FFC6] bg-transparent border-none p-0 outline-none cursor-pointer hover:text-[#00E0B0] transition font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                value={releaseType}
                disabled={isPublished || isPending}
                onChange={(e) => {
                  if (isPublished) return;

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
                    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
                  return formatted;
                })()}
              </div>
            </div>
          </div>

          <section className="mt-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-white/90">Tracklist</h2>
                <div className="mt-1 text-sm text-[#B3B3B3]">{tracks.length} tracks</div>
              </div>

              <button
                onClick={() => {
                  if (status !== "draft") return;
                  setModalOpen(true);
                }}
                disabled={status !== "draft" || isPending}
                className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm font-semibold text-white/90 backdrop-blur transition hover:bg-white/[0.06] hover:border-[#00FFC6]/60 hover:shadow-[0_0_0_1px_rgba(0,255,198,0.25),0_20px_60px_rgba(0,255,198,0.15)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60 disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                <span className="text-white/70 group-hover:text-[#00FFC6] transition">+</span>
                <span className="tracking-tight">Add Tracks</span>
              </button>
            </div>

            <div className="mt-5">
              {tracks.length === 0 ? (
                <div className="px-1 sm:px-2 py-10">
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
                <div className="px-0 sm:px-1">
                  <div className={isPublished ? "pointer-events-none opacity-60" : ""}>
                    <TrackListSortable
                      releaseId={releaseId}
                      tracks={tracks}
                      setTracks={setTracks}
                      onReleaseModified={status === "draft" ? markAsDraft : undefined}
                      eligibilityByTrackId={eligibilityByTrackId}
                      premiumBalance={premiumBalance}
                      trackStatusById={trackStatusById}
                      boostEnabledById={boostEnabledById}
                      releaseStatus={releaseData.status ?? "draft"}
                      releasePublished={hasBeenPublished}
                    />
                  </div>

                  {isPublished ? (
                    <div className="mt-2 text-xs text-white/60">
                      Tracklist is locked because this release is published.
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <AddTrackModal
        open={status === "draft" ? modalOpen : false}
        onClose={() => setModalOpen(false)}
        existingTrackIds={derivedTrackIds}
        releaseId={releaseId}
        clientTracks={tracks}
        setClientTracks={setTracks}
        onReleaseModified={isPublished ? undefined : markAsDraft}
      />

      <DeleteReleaseModal
        open={!(releaseData.status === "draft" || isWithdrawn) ? false : deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => {
          // directly call the server action
          deleteReleaseAction(releaseId);
        }}
      />

      {publishModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setPublishModalOpen(false)}
          />

          <div className="relative w-[92vw] max-w-md rounded-2xl border border-white/10 bg-[#0E0E10] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_30px_120px_rgba(0,0,0,0.6)]">
            <div className="text-lg font-semibold text-white/90">Publish release?</div>

            <div className="mt-2 text-sm text-[#B3B3B3]">
              Publishing is <span className="text-white/90 font-semibold">final</span>.
              After publishing, you can’t edit title, type, cover or tracklist anymore.
            </div>

            <div className="mt-2 text-sm text-[#B3B3B3]">
              If something is wrong, you must{" "}
              <span className="text-white/90 font-semibold">delete</span> the release and create a new one.
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPublishModalOpen(false)}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/85 backdrop-blur transition hover:bg-white/[0.07] hover:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmPublish}
                disabled={isPending || !canPublish}
                className="rounded-xl border border-[#00FFC6]/30 bg-[#00FFC6]/15 px-5 py-2.5 text-sm font-semibold text-[#00FFC6] backdrop-blur transition
  hover:bg-[#00FFC6]/25 hover:border-[#00FFC6]/50
  hover:shadow-[0_0_0_1px_rgba(0,255,198,0.25),0_12px_40px_rgba(0,255,198,0.18)]
  focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/40 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Publish
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Visibility-Modal */}
      {visibilityModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setVisibilityModalOpen(false)}
          />

          <div className="relative w-[92vw] max-w-md rounded-2xl border border-white/10 bg-[#0E0E10] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_30px_120px_rgba(0,0,0,0.6)]">
            <div className="text-lg font-semibold text-white/90">
              {status === "withdrawn" ? "Activate release?" : "Withdraw release?"}
            </div>

            <div className="mt-2 text-sm text-[#B3B3B3]">
              {status === "withdrawn"
                ? "Activating will exit private edit mode. The release remains live for listeners."
                : "Withdrawing will enable private editing without affecting listeners."}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setVisibilityModalOpen(false)}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/85 backdrop-blur transition hover:bg-white/[0.07] hover:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmToggleVisibility}
                disabled={isPending || (status !== "published" && status !== "withdrawn")}
                className="rounded-xl border border-white/15 bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-white/90 backdrop-blur transition
  hover:bg-white/[0.10] hover:border-white/25
  focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status === "withdrawn" ? "Activate" : "Withdraw"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

