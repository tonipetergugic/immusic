"use client";

import { useEffect, useMemo, useState } from "react";
import Tooltip from "@/components/Tooltip";

type ApiErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_JSON"
  | "MISSING_RELEASE_TRACK_ID"
  | "INVALID_STARS"
  | "RELEASE_TRACK_NOT_FOUND"
  | "RATINGS_NOT_ALLOWED_STATUS"
  | "WINDOW_CLOSED"
  | "NOT_ELIGIBLE"
  | "ALREADY_RATED"
  | "INTERNAL_ERROR";

type RatingsGetOk = {
  ok: true;
  summary: {
    release_track_id: string;
    track_id: string | null;
    track_status: string | null;
    rating_avg: number | null;
    rating_count: number;
    stream_count: number;
  };
  my_stars: number | null;
  eligibility: {
    window_open: boolean | null;
    can_rate: boolean | null;
    listened_seconds: number | null;
  };
};

type RatingsErr = { ok: false; error: string; code?: ApiErrorCode };

type TrackRatingInlineProps = {
  releaseTrackId: string;

  // Optional initial rendering (avoid "empty" before GET resolves)
  initialAvg?: number | null;
  initialCount?: number;
  initialStreams?: number;
  initialMyStars?: number | null;

  // Optional: hide streams label on mobile automatically (matches PlaylistRow pattern)
  showStreamsOnDesktopOnly?: boolean;
  readOnly?: boolean;
};

function showNotice(message: string) {
  window.dispatchEvent(new CustomEvent("immusic:notice", { detail: { message } }));
}

function mapNotice(code?: ApiErrorCode, raw?: string) {
  if (code === "UNAUTHORIZED") return "Please log in to rate tracks.";
  if (code === "WINDOW_CLOSED") return "Please listen at least 30 seconds to rate this track.";
  if (code === "RATINGS_NOT_ALLOWED_STATUS") return "Ratings are only allowed for development tracks.";
  if (code === "ALREADY_RATED") return "You have already rated this track.";
  if (code === "NOT_ELIGIBLE") {
    const m = (raw ?? "").toLowerCase();
    if (m.includes("only listeners") || m.includes("only listener") || m.includes("listeners can rate")) {
      return "Only listeners can rate tracks.";
    }
    return "Please listen at least 30 seconds to rate this track.";
  }
  // fallback (legacy raw parsing)
  const m = (raw ?? "").toLowerCase();
  if (m.includes("30s") || m.includes("30 second")) return "Please listen at least 30 seconds to rate this track.";
  if (m.includes("listener")) return "Only listeners can rate tracks.";
  return "Rating failed. Please try again.";
}

export default function TrackRatingInline({
  releaseTrackId,
  initialAvg = null,
  initialCount = 0,
  initialStreams = 0,
  initialMyStars = null,
  showStreamsOnDesktopOnly = true,
  readOnly = false,
}: TrackRatingInlineProps) {
  const [submitting, setSubmitting] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  const [avg, setAvg] = useState<number | null>(initialAvg);
  const [count, setCount] = useState<number>(initialCount);
  const [streams, setStreams] = useState<number>(initialStreams);
  const [myStars, setMyStars] = useState<number | null>(initialMyStars);

  const [eligibility, setEligibility] = useState<{
    window_open: boolean | null;
    can_rate: boolean | null;
    listened_seconds: number | null;
  }>({ window_open: null, can_rate: null, listened_seconds: null });

  const alreadyRated = myStars !== null;
  const [tapInfoOpen, setTapInfoOpen] = useState(false);
  const [confirmOpenFor, setConfirmOpenFor] = useState<number | null>(null);

  const displayStars = useMemo(() => {
    // PlaylistRow: myStars wins; otherwise derived from avg
    return readOnly ? Math.floor(avg ?? 0) : (myStars ?? Math.floor(avg ?? 0));
  }, [myStars, avg, readOnly]);

  const effectiveStars = hover ?? displayStars;

  const eligible = useMemo(() => {
    // Eligibility rules (Phase 2):
    // - listener-only is enforced by backend (eligibility.can_rate)
    // - listen threshold (>=30s)
    // NOTE: window_open is intentionally ignored (kept in response but never used).
    const canRate = Boolean(eligibility.can_rate);
    const listened =
      typeof eligibility.listened_seconds === "number" ? eligibility.listened_seconds : 0;
    return canRate && listened >= 30;
  }, [eligibility]);

  function openTapInfo() {
    setTapInfoOpen(true);
    window.setTimeout(() => setTapInfoOpen(false), 1800);
  }

  async function refresh() {
    const res = await fetch(`/api/ratings?releaseTrackId=${encodeURIComponent(releaseTrackId)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const json = (await res.json()) as RatingsGetOk | RatingsErr;

    if (!json || json.ok !== true) {
      const errObj = json as RatingsErr;
      // If unauthorized, we still show non-interactive baseline
      if (res.status !== 401) showNotice(mapNotice(errObj.code, errObj.error));
      return;
    }

    setAvg(json.summary.rating_avg ?? null);
    setCount(json.summary.rating_count ?? 0);
    setStreams(json.summary.stream_count ?? 0);
    if (!readOnly) {
      setMyStars(json.my_stars ?? null);
      setEligibility(json.eligibility ?? { window_open: null, can_rate: null, listened_seconds: null });
    }
  }

  useEffect(() => {
    if (!releaseTrackId) return;
    if (readOnly) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [releaseTrackId, readOnly]);

  async function handleRate(stars: number) {
    if (readOnly) return;
    if (submitting) return;

    try {
      setSubmitting(true);

      // Speichere myStars vor dem API-Call, um zu prüfen, ob es das erste Rating war
      const wasFirstRating = myStars === null;

      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releaseTrackId, stars }),
      });

      const json = (await res.json()) as { ok: true } | RatingsErr;

      if (!json || (json as any).ok !== true) {
        const errObj = json as RatingsErr;
        showNotice(mapNotice(errObj.code, errObj.error));
        return;
      }

      // Nach erfolgreichem ersten Rating: Hinweis
      if (wasFirstRating) {
        window.dispatchEvent(
          new CustomEvent("immusic:notice", {
            detail: {
              message: "Thanks for rating! Your rating is final and helps the artist improve.",
            },
          })
        );
      }

      // Confirm schließen nach erfolgreichem Rating
      setConfirmOpenFor(null);

      // optimistic + refresh aggregate
      setMyStars(stars);
      await refresh();
    } catch (e) {
      const raw = e instanceof Error ? e.message : "";
      showNotice(mapNotice(undefined, raw));
    } finally {
      setSubmitting(false);
    }
  }

  if (!releaseTrackId) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-neutral-500">
      {readOnly ? (
        <Tooltip label="You already rated this track. Ratings are final." placement="top">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(null)}
                className={[
                  "transition-colors cursor-default",
                  effectiveStars >= n ? "text-[#00FFC6]" : "text-white/35",
                ].join(" ")}
                aria-label={`Rating ${n} star`}
                title={`Rating ${n} star`}
              >
                ★
              </span>
            ))}
          </div>
        </Tooltip>
      ) : alreadyRated ? (
        <Tooltip label="You already rated this track. Ratings are final." placement="top">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => {
              const disabled = submitting || alreadyRated;
              return (
                <button
                  key={n}
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  disabled={disabled}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    openTapInfo();
                  }}
                  className={[
                    "transition-colors",
                    disabled ? "opacity-60 cursor-default" : "hover:text-[#00FFC6]",
                    effectiveStars >= n ? "text-[#00FFC6]" : "text-white/35",
                  ].join(" ")}
                  aria-label={`Rated ${n} star`}
                  title={`Rated ${n} star`}
                >
                  ★
                </button>
              );
            })}
          </div>
        </Tooltip>
      ) : (
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => {
            const disabled = submitting;
            return (
              <button
                key={n}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                disabled={disabled}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmOpenFor(n);
                }}
                className={[
                  "transition-colors",
                  disabled ? "opacity-60 cursor-default" : "hover:text-[#00FFC6]",
                  effectiveStars >= n ? "text-[#00FFC6]" : "text-white/35",
                ].join(" ")}
                aria-label={`Rate ${n} star`}
                title={`Rate ${n} star`}
              >
                ★
              </button>
            );
          })}
        </div>
      )}

      {confirmOpenFor !== null ? (
        <div
          className="fixed z-[96] left-1/2 top-[70%] -translate-x-1/2 w-[320px] max-w-[92vw]
            rounded-2xl border border-white/10 bg-[#0E0E10] p-4 text-sm text-white
            shadow-[0_0_40px_rgba(0,0,0,0.65)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="font-semibold text-white">Confirm rating</div>
          <div className="mt-2 text-white/70 text-xs leading-relaxed">
            Your rating is final. Please confirm before submitting.
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-white/80 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmOpenFor(null);
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              className="px-3 py-2 rounded-xl bg-[#00FFC6] hover:bg-[#00E0B0] text-xs font-semibold text-black transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                const stars = confirmOpenFor;
                setConfirmOpenFor(null);
                if (typeof stars === "number") void handleRate(stars);
              }}
            >
              Rate
            </button>
          </div>
        </div>
      ) : null}

      {tapInfoOpen ? (
        <span
          className="fixed z-[95] left-1/2 top-[70%] -translate-x-1/2 rounded-xl border border-white/10 bg-[#0E0E10] px-3 py-2 text-xs text-white shadow-[0_0_30px_rgba(0,0,0,0.55)] max-w-[280px] whitespace-normal break-words leading-relaxed"
        >
          You already rated this track. Ratings are final.
        </span>
      ) : null}

      {count && count > 0 ? (
        <span className="tabular-nums whitespace-nowrap">
          <span className="text-[#00FFC6] font-semibold">
            Ø {Number(avg ?? 0).toFixed(1)}
          </span>{" "}
          <span className="text-white/50">
            ({count})
          </span>
        </span>
      ) : (
        <span className="text-neutral-600 whitespace-nowrap">No ratings</span>
      )}

      <span className="text-xs text-white/30">·</span>

      <span
        className={[
          "text-xs text-white/50 whitespace-nowrap",
          showStreamsOnDesktopOnly ? "hidden md:inline" : "",
        ].join(" ")}
      >
        {streams ?? 0} streams
      </span>
    </div>
  );
}
