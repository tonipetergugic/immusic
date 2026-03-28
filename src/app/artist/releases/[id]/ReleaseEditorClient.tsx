"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import BackLink from "@/components/BackLink";
import AppSelect from "@/components/AppSelect";
import ReleaseCoverUploader from "./ReleaseCoverUploader";
const TrackListSortable = dynamic(() => import("./TrackListSortable"), {
  ssr: false,
});
import AddTrackModal from "./AddTrackModal";
import { updateReleaseTitleAction } from "./updateReleaseTitleAction";
import { updateReleaseTypeAction } from "./updateReleaseTypeAction";
import { publishReleaseAction } from "./publishReleaseAction";
import { updateReleaseStatusAction } from "./updateReleaseStatusAction";
import DeleteReleaseModal from "@/components/DeleteReleaseModal";
import { deleteReleaseAction } from "./deleteReleaseAction";

const RELEASE_TYPE_ITEMS = [
  { value: "single", label: "SINGLE" },
  { value: "ep", label: "EP" },
  { value: "album", label: "ALBUM" },
];

type Track = { track_id: string; track_title: string; position: number; release_id: string };
type ReleaseStatus = "draft" | "published";
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
    {
      track_status: string | null;
      is_development: boolean;
      exposure_completed: boolean;
      rating_count: number;
      avg_stars: number | null;
    }
  >;
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
  boostEnabledById,
}: ReleaseEditorClientProps) {
  const [tracks, setTracks] = useState<Track[]>(initialTracks ?? []);
  const hasAtLeastOneTrack = tracks.length > 0;
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState(releaseData.title);
  const [savedTitle, setSavedTitle] = useState(releaseData.title);
  const [titlePending, setTitlePending] = useState(false);
  const [releaseType, setReleaseType] = useState(releaseData.release_type);
  const [savedReleaseType, setSavedReleaseType] = useState(releaseData.release_type);
  const [releaseTypePending, setReleaseTypePending] = useState(false);
  const [status, setStatus] = useState<ReleaseStatus>(releaseData.status ?? "draft");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [currentCoverUrl, setCurrentCoverUrl] = useState<string | null>(coverUrl);
  const [isPending, startTransition] = useTransition();
  const isPublished = status === "published";
  const hasBeenPublished = Boolean(releaseData.published_at);
  const hasCover = Boolean(currentCoverUrl);
  const isLocked = isPublished || hasBeenPublished;

  // Publish Preconditions (verbindlich)
  const canPublish =
    !isLocked && hasCover && hasAtLeastOneTrack && allTracksMetadataComplete;

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

  return (
    <div className="w-full text-white">
      <div className="mb-6">
        <BackLink label="Back to Releases" href="/artist/releases" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
        {/* Left column: Lifecycle / control (no cards, minimalist flow) */}
        <div className="space-y-12">
          {/* Cover */}
          <div>
            <div className="mt-4">
              <div
                className={[
                  "mx-auto",
                  "w-full",
                  "max-w-[320px]",
                  "aspect-square",
                  isLocked ? "pointer-events-none opacity-60" : "",
                ].join(" ")}
              >
                <ReleaseCoverUploader
                  releaseId={releaseId}
                  initialCoverUrl={currentCoverUrl}
                  onCoverUrlChange={setCurrentCoverUrl}
                  onReleaseModified={status === "draft" ? markAsDraft : undefined}
                />
              </div>

              {isLocked ? (
                <div className="mt-2 text-xs text-white/60">
                  Cover is locked because this release is published.
                </div>
              ) : null}
            </div>

          </div>

          {/* Pre-Publish Checklist */}
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-white">
                Pre-Publish <span className="text-[#00FFC6]">Checklist</span>
              </h3>

            <div className="mt-2 space-y-2 text-[15px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-white/70">Cover added</span>
                <span
                  className={`inline-flex items-center justify-center w-[112px] rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] ${
                    hasCover
                      ? "border-[#00FFC6]/25 bg-[#00FFC6]/12 text-[#7DFFE3]"
                      : "border-white/10 bg-white/[0.04] text-white/55"
                  }`}
                >
                  {hasCover ? "Ready" : "Missing"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-white/70">At least 1 track</span>
                <span
                  className={`inline-flex items-center justify-center w-[112px] rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] ${
                    hasAtLeastOneTrack
                      ? "border-[#00FFC6]/25 bg-[#00FFC6]/12 text-[#7DFFE3]"
                      : "border-white/10 bg-white/[0.04] text-white/55"
                  }`}
                >
                  {hasAtLeastOneTrack ? "Ready" : "Missing"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-white/70">Track metadata complete</span>
                <span
                  className={`inline-flex items-center justify-center w-[112px] rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] ${
                    allTracksMetadataComplete
                      ? "border-[#00FFC6]/25 bg-[#00FFC6]/12 text-[#7DFFE3]"
                      : "border-white/10 bg-white/[0.04] text-white/55"
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

            <div className="mt-8 flex flex-col gap-2">
              {!isLocked && (
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
  cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Publish Release
                </button>
              )}
            </div>
          </div>

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
                setDeleteModalOpen(true);
              }}
              disabled={isPending}
              className="mt-4 w-full inline-flex cursor-pointer items-center justify-center rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 hover:border-red-500/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
            >
              Delete Release
            </button>
          </div>
        </div>

        {/* Right column: Title / Meta / Tracks */}
        <div className="min-w-0">
          <div className="pb-2">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <input
                      className="w-full bg-transparent text-5xl font-semibold tracking-tight text-white outline-none border-b border-white/10 pb-4 transition placeholder:text-white/25 focus:border-[#00FFC6]/60 disabled:cursor-not-allowed disabled:opacity-60 sm:text-6xl"
                      value={title}
                      disabled={isLocked || titlePending}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={() => {
                        if (isLocked || titlePending) return;

                        const trimmed = title.trim();

                        if (trimmed === savedTitle) return;

                        setTitlePending(true);

                        startTransition(async () => {
                          try {
                            const result = await updateReleaseTitleAction(releaseId, trimmed);

                            if (!result?.error) {
                              setSavedTitle(trimmed);
                              markAsDraft();
                            } else {
                              alert(result.error);
                            }
                          } finally {
                            setTitlePending(false);
                          }
                        });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      aria-busy={titlePending}
                      aria-disabled={isLocked || titlePending}
                    />
                  </div>

                  <div className="shrink-0 sm:pt-2">
                    <span
                      className={`inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] ${
                        status === "published"
                          ? "border-[#00FFC6]/25 bg-[#00FFC6]/12 text-[#7DFFE3]"
                          : "border-white/10 bg-white/[0.04] text-white/60"
                      }`}
                    >
                      {status === "published" ? "Published" : "Draft"}
                    </span>
                  </div>
                </div>

                {titlePending ? (
                  <div className="mt-3 text-sm font-medium text-[#00FFC6]">Saving title...</div>
                ) : null}

                <div className="mt-2 flex items-center gap-3 text-sm text-white/70">
                  <div className="min-w-[132px]">
                    <AppSelect
                      value={releaseType}
                      disabled={isLocked || releaseTypePending}
                      items={RELEASE_TYPE_ITEMS}
                      className="[&>button]:h-auto [&>button]:rounded-none [&>button]:border-0 [&>button]:bg-transparent [&>button]:p-0 [&>button]:text-sm [&>button]:font-semibold [&>button]:uppercase [&>button]:tracking-[0.16em] [&>button]:text-[#00FFC6] [&>button]:shadow-none [&>button]:hover:text-[#00E0B0] [&>button]:focus:ring-0 [&>button]:focus:border-transparent [&>button_svg]:text-[#00FFC6]/70"
                      onChange={(nextType) => {
                        if (isLocked || releaseTypePending) return;

                        setReleaseType(nextType);

                        if (nextType === savedReleaseType) return;

                        setReleaseTypePending(true);

                        startTransition(async () => {
                          try {
                            const result = await updateReleaseTypeAction(releaseId, nextType);

                            if (!result?.error) {
                              setSavedReleaseType(nextType);
                              markAsDraft();
                            } else {
                              alert(result.error);
                              setReleaseType(savedReleaseType);
                            }
                          } finally {
                            setReleaseTypePending(false);
                          }
                        });
                      }}
                    />
                  </div>

                  <span className="text-white/20">•</span>

                  <div className="text-sm text-[#B3B3B3]">
                    <span className="text-white/55">Created</span>{" "}
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
            </div>
          </div>

          <section className="mt-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-white/90">Tracklist</h2>
                <div className="mt-1 text-sm text-white/60">{tracks.length} tracks</div>
              </div>

              <button
                onClick={() => {
                  if (isLocked) return;
                  setModalOpen(true);
                }}
                disabled={isLocked || isPending}
                className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/10 px-4 py-2 text-sm font-semibold text-white/80 hover:border-[#00FFC6]/40 hover:bg-[#00FFC6]/10 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                <span className="text-white/70 group-hover:text-[#00FFC6] transition">+</span>
                <span className="tracking-tight">Add Tracks</span>
              </button>
            </div>

            <div className="mt-6">
              {tracks.length === 0 ? (
                <div className="px-1 py-8 sm:px-2">
                  <div className="text-base font-semibold text-white/90">
                    No tracks yet
                  </div>
                  <div className="mt-1 text-sm text-[#B3B3B3]">
                    Click “Add Tracks”.
                  </div>
                </div>
              ) : (
                <div className="px-0 sm:px-1">
                  <div>
                    <TrackListSortable
                      releaseId={releaseId}
                      tracks={tracks}
                      setTracks={setTracks}
                      onReleaseModified={status === "draft" ? markAsDraft : undefined}
                      eligibilityByTrackId={eligibilityByTrackId}
                      boostEnabledById={boostEnabledById}
                      releaseStatus={status}
                      releasePublished={isLocked}
                    />
                  </div>

                  {isLocked ? (
                    <div className="mt-2 text-xs text-white/60">
                      Tracklist locked because this release is published.
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <AddTrackModal
        open={!isLocked ? modalOpen : false}
        onClose={() => setModalOpen(false)}
        existingTrackIds={derivedTrackIds}
        releaseId={releaseId}
        clientTracks={tracks}
        setClientTracks={setTracks}
        onReleaseModified={isLocked ? undefined : markAsDraft}
      />

      <DeleteReleaseModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => {
          startTransition(async () => {
            const result = await deleteReleaseAction(releaseId);

            if (result?.error) {
              alert(result.error);
            }
          });
        }}
        status={status}
        isPending={isPending}
      />

      {publishModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              if (isPending) return;
              setPublishModalOpen(false);
            }}
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

            <div className="mt-2 text-sm text-[#B3B3B3]">
              Tracks will automatically enter{" "}
              <span className="text-white/90 font-semibold">Development Discovery</span> after publishing.
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isPending) return;
                  setPublishModalOpen(false);
                }}
                disabled={isPending}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/85 backdrop-blur transition hover:bg-white/[0.07] hover:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50"
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
                {isPending ? "Publishing..." : "Publish"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}

