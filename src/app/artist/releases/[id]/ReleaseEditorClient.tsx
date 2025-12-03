"use client";

import { useMemo, useState } from "react";
import ReleaseCoverUploader from "./ReleaseCoverUploader";
import TrackListSortable from "./TrackListSortable";
import AddTrackModal from "./AddTrackModal";

type Track = { track_id: string; track_title: string; position: number; release_id: string };
type ReleaseData = { title: string; release_type: string; created_at: string };

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

  const derivedTrackIds = useMemo(() => {
    if (tracks.length > 0) {
      return tracks.map((t) => t.track_id);
    }
    return existingTrackIds;
  }, [tracks, existingTrackIds]);

  return (
    <div className="text-white p-6">
      <ReleaseCoverUploader releaseId={releaseId} initialCoverUrl={coverUrl} />

      <h1 className="text-2xl font-bold">{releaseData.title}</h1>
      <p className="text-sm text-gray-400 uppercase mt-1">{releaseData.release_type}</p>
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
      />

      {tracks.length === 0 ? (
        <p className="text-sm text-gray-400">No tracks added yet</p>
      ) : (
        <TrackListSortable releaseId={releaseId} tracks={tracks} setTracks={setTracks} />
      )}
    </div>
  );
}

