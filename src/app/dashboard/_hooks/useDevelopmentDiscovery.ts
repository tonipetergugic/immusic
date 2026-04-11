"use client";

import { useEffect, useState, type MutableRefObject } from "react";
import type {
  DevelopmentDiscoveryItem,
  DevelopmentDiscoveryResponse,
} from "@/lib/discovery/fetchDevelopmentDiscovery.client";

type ErrorResponse = {
  ok: false;
  error: string;
  details?: string;
};

type DevelopmentMetaResponse = {
  ok: boolean;
  error?: string;
  myStarsByTrackId?: Record<string, number | null>;
  listenStateByTrackId?: Record<
    string,
    {
      can_rate: boolean | null;
      listened_seconds: number | null;
    }
  >;
};

function getErrorMessage(
  err: unknown,
  fallback: string
): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

type Params = {
  discoveryMode: "development" | "performance";
  isEnabled: boolean;
  devGenre: string;
  isListener: boolean;
  viewerUserId: string | null;
  devCacheRef: MutableRefObject<Record<string, DevelopmentDiscoveryItem[]>>;
  devPromiseRef: MutableRefObject<Record<string, Promise<DevelopmentDiscoveryItem[]> | null>>;
};

export function useDevelopmentDiscovery({
  discoveryMode,
  isEnabled,
  devGenre,
  isListener,
  viewerUserId,
  devCacheRef,
  devPromiseRef,
}: Params) {
  const [devItems, setDevItems] = useState<DevelopmentDiscoveryItem[]>([]);
  const [devLoading, setDevLoading] = useState(false);
  const [devError, setDevError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEnabled || discoveryMode !== "development") return;

    let cancelled = false;

    const cacheKey = `limit20:${devGenre && devGenre !== "all" ? devGenre : "all"}`;
    const cached = devCacheRef.current[cacheKey];

    if (cached) {
      setDevError(null);
      setDevItems(cached);
      return () => {
        cancelled = true;
      };
    }

    const existingPromise = devPromiseRef.current[cacheKey];
    if (existingPromise) {
      existingPromise
        .then((items) => {
          if (!cancelled) {
            setDevError(null);
            setDevItems(items);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setDevError(getErrorMessage(err, "Failed to load development tracks"));
          }
        })
        .finally(() => {
          if (!cancelled) setDevLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }

    async function loadDev() {
      try {
        setDevLoading(true);
        setDevError(null);

        const qs = new URLSearchParams();
        qs.set("limit", "20");
        if (devGenre && devGenre !== "all") qs.set("genre", devGenre);

        const p = (async () => {
          const r = await fetch(`/api/dashboard/development-feed?${qs.toString()}`, {
            method: "GET",
            credentials: "include",
          });

          const data = (await r.json()) as DevelopmentDiscoveryResponse | ErrorResponse;

          if (!r.ok || !("ok" in data) || data.ok === false) {
            const err = data as ErrorResponse;
            throw new Error(
              err.details
                ? `${err.error}: ${err.details}`
                : err.error ?? "dev_discovery_error"
            );
          }

          let nextItems = data.items ?? [];

          const trackIds = nextItems
            .map((item) => item.track_id)
            .filter((value): value is string => typeof value === "string" && value.length > 0);

          if (viewerUserId && trackIds.length > 0) {
            try {
              const metaRes = await fetch("/api/dashboard/development-meta", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                cache: "no-store",
                body: JSON.stringify({
                  trackIds,
                  includeListenState: isListener,
                }),
              });

              if (metaRes.ok) {
                const metaJson = (await metaRes.json()) as DevelopmentMetaResponse;

                if (metaJson.ok) {
                  const myStarsRecord = metaJson.myStarsByTrackId ?? {};
                  const listenStateRecord = metaJson.listenStateByTrackId ?? {};

                  nextItems = nextItems.map((item) => {
                    const metaListenState = listenStateRecord[item.track_id];

                    return {
                      ...item,
                      my_stars:
                        typeof myStarsRecord[item.track_id] === "number"
                          ? myStarsRecord[item.track_id]
                          : null,
                      eligibility: {
                        ...item.eligibility,
                        can_rate: isListener
                          ? typeof metaListenState?.can_rate === "boolean"
                            ? metaListenState.can_rate
                            : false
                          : false,
                        listened_seconds: isListener
                          ? typeof metaListenState?.listened_seconds === "number"
                            ? metaListenState.listened_seconds
                            : 0
                          : 0,
                      },
                    };
                  });
                }
              }
            } catch {
              // ignore meta errors so development feed still renders
            }
          }

          return nextItems;
        })();

        devPromiseRef.current[cacheKey] = p;

        const nextItems = await p;

        devCacheRef.current[cacheKey] = nextItems;

        if (!cancelled) {
          setDevItems(nextItems);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setDevError(getErrorMessage(err, "Failed to load development tracks"));
        }
      } finally {
        devPromiseRef.current[cacheKey] = null;
        if (!cancelled) setDevLoading(false);
      }
    }

    loadDev();

    return () => {
      cancelled = true;
    };
  }, [discoveryMode, isEnabled, devGenre, isListener, viewerUserId]);

  return {
    devItems,
    devLoading,
    devError,
  };
}
