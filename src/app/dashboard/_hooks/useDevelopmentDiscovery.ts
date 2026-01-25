"use client";

import React, { useEffect, useState } from "react";

export type DevelopmentDiscoveryItem = any;

type Params = {
  discoveryMode: "development" | "performance";
  devGenre: string;
  devCacheRef: React.MutableRefObject<Record<string, DevelopmentDiscoveryItem[]>>;
  devPromiseRef: React.MutableRefObject<Record<string, Promise<DevelopmentDiscoveryItem[]> | null>>;
};

export function useDevelopmentDiscovery({ discoveryMode, devGenre, devCacheRef, devPromiseRef }: Params) {
  const [devItems, setDevItems] = useState<DevelopmentDiscoveryItem[]>([]);
  const [devLoading, setDevLoading] = useState(false);
  const [devError, setDevError] = useState<string | null>(null);

  useEffect(() => {
    if (discoveryMode !== "development") return;

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
        .catch((err: any) => {
          if (!cancelled) setDevError(err?.message ?? "Failed to load development tracks");
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
          const r = await fetch(`/api/discovery/development?${qs.toString()}`, {
            method: "GET",
            credentials: "include",
          });

          const data = await r.json();

          if (!r.ok || !data?.ok) {
            throw new Error(
              data?.details
                ? `${data?.error}: ${data?.details}`
                : data?.error ?? "dev_discovery_error"
            );
          }

          return (data.items ?? []) as DevelopmentDiscoveryItem[];
        })();

        devPromiseRef.current[cacheKey] = p;

        const nextItems = await p;

        devCacheRef.current[cacheKey] = nextItems;

        if (!cancelled) {
          setDevItems(nextItems);
        }
      } catch (err: any) {
        if (!cancelled) setDevError(err?.message ?? "Failed to load development tracks");
      } finally {
        devPromiseRef.current[cacheKey] = null;
        if (!cancelled) setDevLoading(false);
      }
    }

    loadDev();

    return () => {
      cancelled = true;
    };
  }, [discoveryMode, devGenre]);

  return {
    devItems,
    devLoading,
    devError,
  };
}
