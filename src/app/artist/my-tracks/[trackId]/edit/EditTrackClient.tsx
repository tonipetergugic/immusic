"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteTrackAction,
  inviteTrackCollaboratorAction,
  renameTrackAction,
  type RenameTrackPayload,
} from "../../actions";
import BackLink from "@/components/BackLink";
import LyricsModal from "./LyricsModal";
import DeleteTrackModal from "./DeleteTrackModal";
import TrackActionsSection from "./TrackActionsSection";
import CollaborationSection from "./CollaborationSection";
import TrackMetadataSection from "./TrackMetadataSection";
import type {
  AcceptedCollab,
  CollabResult,
  CollaborationRole,
  PendingInvite,
  Track,
} from "./types";
import {
  BPM_SUGGESTIONS,
  TRACK_VERSION_OPTIONS,
  TRACK_VERSION_VALUES,
} from "./trackMetadataOptions";
import { ALLOWED_KEYS, KEY_SUGGESTIONS } from "./trackKeyOptions";

export default function EditTrackClient({
  track,
  initialPendingInvites,
  initialAcceptedCollabs,
}: {
  track: Track;
  initialPendingInvites: PendingInvite[];
  initialAcceptedCollabs: AcceptedCollab[];
}) {
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form
  const [newTitle, setNewTitle] = useState(track.title);
  const [newBpm, setNewBpm] = useState<string>(track.bpm ? String(track.bpm) : "");
  const [newKey, setNewKey] = useState<string>(track.key ?? "");
  const [newGenre, setNewGenre] = useState<string>(track.genre ?? "");
  const [newVersion, setNewVersion] = useState<string>(track.version ?? "");
  const [newHasLyrics, setNewHasLyrics] = useState<boolean>(Boolean(track.has_lyrics));
  const [newIsExplicit, setNewIsExplicit] = useState<boolean>(Boolean(track.is_explicit));
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);
  const editSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [newLyrics, setNewLyrics] = useState<string>(track.lyrics ?? "");
  const [isLyricsModalOpen, setIsLyricsModalOpen] = useState(false);
  const [lyricsDraft, setLyricsDraft] = useState<string>(track.lyrics ?? "");

  // Collaboration
  const [collabQuery, setCollabQuery] = useState("");
  const [collabRole, setCollabRole] = useState<CollaborationRole>("CO_OWNER");
  const [collabResults, setCollabResults] = useState<CollabResult[]>([]);
  const [collabLoading, setCollabLoading] = useState(false);
  const [collabError, setCollabError] = useState<string | null>(null);
  const [collabSuccess, setCollabSuccess] = useState<string | null>(null);

  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>(initialPendingInvites);

  const [acceptedCollabs, setAcceptedCollabs] = useState<AcceptedCollab[]>(initialAcceptedCollabs);

  useEffect(() => {
    setPendingInvites(initialPendingInvites);
  }, [initialPendingInvites]);

  useEffect(() => {
    setAcceptedCollabs(initialAcceptedCollabs);
  }, [initialAcceptedCollabs]);

  useEffect(() => {
    return () => {
      if (editSuccessTimeoutRef.current) {
        clearTimeout(editSuccessTimeoutRef.current);
      }
    };
  }, []);

  const runCollabSearch = async () => {
    if (track.is_locked) return;

    const q = collabQuery.trim();
    setCollabError(null);
    setCollabSuccess(null);

    if (q.length < 2) {
      setCollabResults([]);
      return;
    }

    setCollabLoading(true);
    try {
      const res = await fetch(`/api/artist/collab-search?q=${encodeURIComponent(q)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        setCollabResults([]);
        setCollabError("Failed to search artists.");
        return;
      }

      const json = await res.json();
      const results = Array.isArray(json?.results) ? json.results : [];

      // extra safety: never show the track owner
      const filtered = results.filter((p: any) => p?.id && p.id !== track.artist_id);

      setCollabResults(filtered);
    } catch {
      setCollabError("Failed to search artists.");
      setCollabResults([]);
    } finally {
      setCollabLoading(false);
    }
  };

  const handleOpenLyricsModal = () => {
    setLyricsDraft(newLyrics);
    setIsLyricsModalOpen(true);
  };

  const handleHasLyricsChange = (value: boolean) => {
    setNewHasLyrics(value);
    if (!value) {
      setNewIsExplicit(false);
    }
  };

  const handleInviteCollaborator = async (p: CollabResult) => {
    if (track.is_locked) return;

    setCollabError(null);
    setCollabSuccess(null);

    try {
      await inviteTrackCollaboratorAction({
        trackId: track.id,
        inviteeProfileId: p.id,
        role: collabRole,
      });
      setCollabSuccess(`Invite sent to ${p.display_name}`);
      setPendingInvites((prev) => [
        {
          id: `optimistic_${Date.now()}`,
          role: collabRole,
          invitee_display_name: p.display_name ?? null,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setCollabResults([]);
      setCollabQuery("");
    } catch (e: any) {
      setCollabError(e?.message ?? "Failed to send invite.");
    }
  };

  const handleRefreshCollaborations = () => {
    if (track.is_locked) return;

    setCollabError(null);
    setCollabSuccess(null);
    router.refresh();
  };

  const handleDone = () => {
    router.push("/artist/my-tracks");
  };

  const handleViewFeedback = () => {
    if (!track.queue_id) return;

    router.push(
      `/artist/upload/feedback?queue_id=${encodeURIComponent(track.queue_id)}`
    );
  };

  const handleOpenDeleteModal = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteTrack = () => {
    startTransition(async () => {
      await deleteTrackAction(track.id, track.audio_path ?? "");
      setShowDeleteModal(false);
      router.push("/artist/my-tracks");
      router.refresh();
    });
  };

  const handleSave = () => {
    startTransition(async () => {
      setEditSuccess(null);

      const titleValue = newTitle.trim();
      if (titleValue.length === 0) {
        setEditError("Title cannot be empty.");
        return;
      }

      let bpmValue: number | null = null;
      if (newBpm !== "") {
        const parsed = Number.parseInt(newBpm, 10);
        if (Number.isNaN(parsed) || parsed < 40 || parsed > 240) {
          setEditError("BPM must be between 40 and 240.");
          return;
        }
        bpmValue = parsed;
      }

      const trimmedKey = newKey.trim();
      let keyValue: string | null = null;
      if (trimmedKey !== "") {
        if (!ALLOWED_KEYS.has(trimmedKey)) {
          setEditError("Key must be a valid Ableton key (e.g. F#m, Dm).");
          return;
        }
        keyValue = trimmedKey;
      }

      const versionValue = newVersion.trim() === "" ? "None" : newVersion.trim();

      if (!TRACK_VERSION_VALUES.has(versionValue as any)) {
        setEditError("Version must be a valid preset.");
        return;
      }

      setEditError(null);

      const payload: RenameTrackPayload = {
        title: titleValue,
        bpm: bpmValue,
        key: keyValue,
        genre: newGenre.trim() === "" ? null : newGenre.trim(),
        has_lyrics: newHasLyrics,
        lyrics: newHasLyrics ? (newLyrics.trim() === "" ? null : newLyrics) : null,
        is_explicit: newHasLyrics ? newIsExplicit : false,
        version: versionValue,
      };

      await renameTrackAction(track.id, payload);

      if (editSuccessTimeoutRef.current) {
        clearTimeout(editSuccessTimeoutRef.current);
      }

      setEditSuccess("Saved.");
      editSuccessTimeoutRef.current = setTimeout(() => {
        setEditSuccess(null);
      }, 2500);
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1320px] pb-24">
      {/* Header */}
      <div className="mt-2 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <BackLink className="mb-4" />

          <h1 className="text-4xl font-semibold tracking-tight text-white drop-shadow-[0_0_30px_rgba(0,255,198,0.15)]">
            Edit Track
          </h1>

          <p className="mt-1 text-sm text-white/60">
            Update metadata used for releases and discovery.
          </p>
        </div>
      </div>

      <datalist id="bpm-suggestions">
        {BPM_SUGGESTIONS.map((bpm) => (
          <option key={bpm} value={bpm} />
        ))}
      </datalist>

      <datalist id="key-suggestions">
        {KEY_SUGGESTIONS.map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>

      {/* 2-column layout */}
      <div className="mt-10 grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.45fr)_420px] xl:items-stretch">
        {/* Left column */}
        <TrackMetadataSection
          newTitle={newTitle}
          onTitleChange={setNewTitle}
          newBpm={newBpm}
          onBpmChange={setNewBpm}
          newKey={newKey}
          onKeyChange={setNewKey}
          allowedKeys={ALLOWED_KEYS}
          newVersion={newVersion}
          onVersionChange={setNewVersion}
          trackVersionOptions={TRACK_VERSION_OPTIONS}
          newGenre={newGenre}
          onGenreChange={setNewGenre}
          newHasLyrics={newHasLyrics}
          isLocked={track.is_locked}
          onHasLyricsChange={handleHasLyricsChange}
          newIsExplicit={newIsExplicit}
          onIsExplicitChange={setNewIsExplicit}
          newLyrics={newLyrics}
          onLyricsChange={setNewLyrics}
          onOpenLyricsModal={handleOpenLyricsModal}
        />

        {/* Right column */}
        <div className="min-w-0 xl:flex xl:h-full xl:flex-col xl:gap-8">
          <CollaborationSection
            isLocked={track.is_locked}
            collabQuery={collabQuery}
            onCollabQueryChange={setCollabQuery}
            collabRole={collabRole}
            onCollabRoleChange={setCollabRole}
            collabLoading={collabLoading}
            onSearch={runCollabSearch}
            collabError={collabError}
            collabSuccess={collabSuccess}
            collabResults={collabResults}
            onInvite={handleInviteCollaborator}
            onRefresh={handleRefreshCollaborations}
            pendingInvites={pendingInvites}
            acceptedCollabs={acceptedCollabs}
          />

          <TrackActionsSection
            editError={editError}
            editSuccess={editSuccess}
            isPending={isPending}
            isLocked={track.is_locked}
            queueId={track.queue_id}
            onSave={handleSave}
            onDone={handleDone}
            onViewFeedback={handleViewFeedback}
            onDelete={handleOpenDeleteModal}
          />
        </div>
      </div>

      <LyricsModal
        open={isLyricsModalOpen}
        value={newLyrics}
        draft={lyricsDraft}
        onDraftChange={setLyricsDraft}
        onClose={() => setIsLyricsModalOpen(false)}
        onApply={() => {
          setNewLyrics(lyricsDraft);
          setIsLyricsModalOpen(false);
        }}
      />

      <DeleteTrackModal
        open={showDeleteModal}
        isPending={isPending}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteTrack}
      />
    </div>
  );
}
