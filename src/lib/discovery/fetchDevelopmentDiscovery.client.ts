export type DevelopmentDiscoveryItem = {
  track_id: string;
  release_id: string;
  artist_id: string;

  title: string;
  artist_name: string | null;
  cover_path: string | null;
  audio_path: string;

  exposure: {
    target_listeners: number;
    delivered_listeners: number;
    progress: number; // 0..1
    started_at: string | null;
    status: string; // "active" | "completed"
  };

  debug_reason?: {
    eligible: boolean;
    reason: string;
    sort_keys: {
      progress: number;
      started_at: string;
      tiebreaker: number;
    };
  };
};

export type DevelopmentDiscoveryResponse = {
  ok: true;
  contract_version: "v1";
  mode: "development";
  slotting: { limit: number };
  items: DevelopmentDiscoveryItem[];
  debug?: {
    limit: number;
    returned: number;
    ordering: string[];
    warnings: string[];
  };
};

type ErrorResponse = {
  ok: false;
  error: string;
  details?: string;
};

export async function fetchDevelopmentDiscovery(opts?: {
  limit?: number;
  debug?: boolean;
  signal?: AbortSignal;
}): Promise<DevelopmentDiscoveryResponse> {
  const limit = opts?.limit ?? 30;
  const debug = opts?.debug ?? false;

  const qs = new URLSearchParams();
  qs.set("limit", String(limit));
  if (debug) qs.set("debug", "true");

  const res = await fetch(`/api/discovery/development?${qs.toString()}`, {
    method: "GET",
    credentials: "include",
    signal: opts?.signal,
  });

  const data = (await res.json()) as DevelopmentDiscoveryResponse | ErrorResponse;

  if (!res.ok || !("ok" in data) || data.ok === false) {
    const err = data as ErrorResponse;
    throw new Error(err.details ? `${err.error}: ${err.details}` : err.error);
  }

  return data as DevelopmentDiscoveryResponse;
}
