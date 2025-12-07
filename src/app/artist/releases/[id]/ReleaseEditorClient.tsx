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
};

export default function ReleaseEditorClient({
  releaseId,
  initialTracks,
  existingTrackIds,
  releaseData,
  coverUrl,
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

  return (
    <div className="text-white p-6">
      <ReleaseCoverUploader
        releaseId={releaseId}
        initialCoverUrl={coverUrl}
        onReleaseModified={markAsDraft}
      />

      {status === "draft" &&
        releaseData.updated_at &&
        releaseData.created_at !== releaseData.updated_at && (
        <div className="bg-yellow-600/20 border border-yellow-500 text-yellow-300 px-4 py-2 rounded my-4">
          ⚠️ This release has been modified. Please re-publish to make your changes public.
        </div>
        )}

      <input
        className="text-2xl font-bold bg-transparent outline-none border-b border-transparent focus:border-[#00FFC6] transition w-full max-w-xl"
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
      <select
        className="mt-1 text-sm text-gray-200 bg-transparent border border-gray-600 rounded px-2 py-1 uppercase outline-none focus:border-[#00FFC6] transition"
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
      <p className="text-xs mt-2">
        {(() => {
          const d = new Date(releaseData.created_at);
          const formatted =
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ` +
            `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
          return formatted;
        })()}
      </p>

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
        className="px-4 py-2 mb-4 mr-3 rounded bg-[#00FFC6] text-black font-semibold hover:bg-[#00E0B0] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "published" ? "Published" : "Publish Release"}
      </button>

      <button
        onClick={() => setModalOpen(true)}
        className="px-4 py-2 mt-6 mb-4 rounded bg-[#00FFC6] text-black font-semibold hover:bg-[#00E0B0]"
      >
        Add Tracks
      </button>

      <AddTrackModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        existingTrackIds={derivedTrackIds}
        releaseId={releaseId}
        clientTracks={tracks}
        setClientTracks={setTracks}
        onReleaseModified={markAsDraft}
      />

      {tracks.length === 0 ? (
        <p className="text-sm text-gray-400">No tracks added yet</p>
      ) : (
        <TrackListSortable
          releaseId={releaseId}
          tracks={tracks}
          setTracks={setTracks}
          onReleaseModified={markAsDraft}
        />
      )}

      <button
        onClick={() => setDeleteModalOpen(true)}
        className="mt-8 px-4 py-2 rounded bg-red-600 hover:bg-red-500 text-white font-semibold"
      >
        Delete Release
      </button>

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

