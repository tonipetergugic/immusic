export type CollaborationRole = "CO_OWNER" | "FEATURED";

export type Track = {
  id: string;
  title: string;
  version: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  lyrics: string | null;
  has_lyrics: boolean;
  is_explicit: boolean;
  artist_id: string;
  audio_path: string | null;
  queue_id: string | null;
  is_locked: boolean;
};

export type CollabResult = {
  id: string;
  display_name: string;
};

export type PendingInvite = {
  id: string;
  role: CollaborationRole;
  invitee_display_name: string | null;
  created_at: string;
};

export type AcceptedCollab = {
  id: string;
  role: CollaborationRole;
  display_name: string | null;
};
