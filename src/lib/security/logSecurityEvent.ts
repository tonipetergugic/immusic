"use server";

import "server-only";
import { createClient } from "@supabase/supabase-js";

type SecuritySeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH";

export type LogSecurityEventInput = {
  eventType: string;
  severity?: SecuritySeverity;

  actorUserId?: string | null;
  queueId?: string | null;
  unlockId?: string | null;

  reason?: string | null;
  hashChecked?: boolean;

  queueAudioHash?: string | null;
  unlockAudioHash?: string | null;

  metadata?: Record<string, any>;
};

function getServiceSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceKey) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function logSecurityEvent(input: LogSecurityEventInput) {
  const supabase = getServiceSupabaseClient();

  const {
    eventType,
    severity = "INFO",
    actorUserId = null,
    queueId = null,
    unlockId = null,
    reason = null,
    hashChecked = false,
    queueAudioHash = null,
    unlockAudioHash = null,
    metadata = {},
  } = input;

  const { error } = await supabase.from("security_events").insert({
    event_type: eventType,
    severity,
    actor_user_id: actorUserId,
    queue_id: queueId,
    unlock_id: unlockId,
    reason,
    hash_checked: hashChecked,
    queue_audio_hash: queueAudioHash,
    unlock_audio_hash: unlockAudioHash,
    metadata,
  });

  if (error) {
    // Logging darf niemals die Hauptlogik brechen.
    // Wir werfen hier absichtlich nicht, sondern geben das Problem als Konsole aus.
    console.error("logSecurityEvent failed:", error);
  }
}
