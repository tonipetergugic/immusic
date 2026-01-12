"use client";

import { useState } from "react";
import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const DEFAULT_TRACK_ID = "87aaf282-3ecc-4052-b2e5-26d54ede673b";

export default function ExposureTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [trackId, setTrackId] = useState(DEFAULT_TRACK_ID);

  useEffect(() => {
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
      }
    })();
  }, []);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/tracks/${trackId}/exposure/delivered`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json().catch(() => ({}));
      setResult({ status: res.status, json });
    } catch (e: any) {
      setResult({ error: e?.message ?? String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 18, fontWeight: 600 }}>Exposure Test</h1>
      <div style={{ marginTop: 8 }}>
        <div style={{ marginBottom: 6 }}>Track ID</div>
        <input
          value={trackId}
          onChange={(e) => setTrackId(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #333",
            background: "#0b0b0b",
            color: "#eee",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          }}
        />
      </div>

      <button
        onClick={run}
        disabled={loading}
        style={{
          marginTop: 12,
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid #333",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Running..." : "POST /exposure/delivered"}
      </button>

      <pre style={{ marginTop: 16, background: "#111", color: "#eee", padding: 12, borderRadius: 10, overflow: "auto" }}>
        {result ? JSON.stringify(result, null, 2) : "No result yet"}
      </pre>
    </div>
  );
}

