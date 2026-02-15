import type { HardFailReason } from "@/lib/ai/track-check/rules";

export type TrackCheckDecision = "approved" | "rejected";

/** Shape of the row returned by select("id, user_id, audio_path, title, status, hash_status, audio_hash") on tracks_ai_queue */
export type PendingQueueItemRow = {
  id: string;
  user_id: string;
  audio_path: string | null;
  title: string | null;
  status: string;
  hash_status: string | null;
  audio_hash: string | null;
};

/** Shape of the row returned by select("id, status, audio_hash") on tracks_ai_queue for terminal items */
export type LastTerminalItemRow = {
  id: string;
  status: TrackCheckDecision;
  audio_hash: string | null;
};

export type TrackCheckHardFailReason = HardFailReason;
export type TrackCheckHardFailReasons = HardFailReason[];

export type TrackCheckPrivateMetrics = Record<string, unknown>;

export type TrackCheckPublicTerminalResponse =
  | { ok: true; terminal: true; decision: TrackCheckDecision; message: string }
  | { ok: true; terminal: false; status: "pending"; message: string };

export type TerminalDecision = {
  ok: true;
  processed: true;
  decision: TrackCheckDecision;
  feedback_available: boolean;
  queue_id: string;
  reason?: string;
};
