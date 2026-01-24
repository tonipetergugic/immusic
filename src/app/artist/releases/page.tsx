"use client";

import Link from "next/link";
import { Plus, Disc3 } from "lucide-react";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ReleaseRecord = {
  id: string;
  title: string;
  release_type: string;
  cover_path: string | null;
  created_at: string;
  status?: string | null;
  cover_url?: string | null;
};

export default function ReleasesPage() {
  const [releases, setReleases] = useState<ReleaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    let isMounted = true;

    async function loadReleases() {
      setLoading(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user?.id) {
          if (isMounted) {
            setReleases([]);
          }
          return;
        }

        const { data, error } = await supabase
          .from("releases")
          .select("id, title, release_type, cover_path, created_at, status")
          .eq("artist_id", user.id)
          .order("created_at", { ascending: false });

        if (!isMounted) {
          return;
        }

        if (!error && data) {
          const withCoverUrls = data.map((release) => ({
            ...release,
            cover_url: release.cover_path
              ? supabase.storage
                  .from("release_covers")
                  .getPublicUrl(release.cover_path).data.publicUrl
              : null,
          }));
          setReleases(withCoverUrls);
        } else {
          setReleases([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadReleases();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleReleases = releases
    .filter((r: any) => {
      const q = query.trim().toLowerCase();
      const matchesQuery = !q || String(r.title ?? "").toLowerCase().includes(q);

      const s = String(r.status ?? "draft");
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "published"
          ? s === "published"
          : s !== "published";

      return matchesQuery && matchesStatus;
    })
    .sort((a: any, b: any) => {
      const aLive = String(a.status ?? "draft") === "published" ? 1 : 0;
      const bLive = String(b.status ?? "draft") === "published" ? 1 : 0;

      // Live first
      if (aLive !== bLive) return bLive - aLive;

      // Within group: newest first
      const at = new Date(a.created_at).getTime();
      const bt = new Date(b.created_at).getTime();
      return bt - at;
    });

  return (
    <div className="w-full max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="flex items-center gap-3 text-4xl font-semibold tracking-tight text-white">
            <Disc3 className="h-7 w-7 text-[#00FFC6]" />
            My Releases
          </h1>
          <p className="mt-2 text-sm text-[#B3B3B3]">
            Manage your releases, covers and details.
          </p>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={[
                "rounded-full border px-3 py-1 text-[11px] font-semibold backdrop-blur transition",
                statusFilter === "all"
                  ? "border-[#00FFC6]/40 bg-[#00FFC6]/10 text-[#00FFC6]"
                  : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]",
              ].join(" ")}
            >
              All
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("published")}
              className={[
                "rounded-full border px-3 py-1 text-[11px] font-semibold backdrop-blur transition",
                statusFilter === "published"
                  ? "border-[#00FFC6]/40 bg-[#00FFC6]/10 text-[#00FFC6]"
                  : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]",
              ].join(" ")}
            >
              Live
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("draft")}
              className={[
                "rounded-full border px-3 py-1 text-[11px] font-semibold backdrop-blur transition",
                statusFilter === "draft"
                  ? "border-[#00FFC6]/40 bg-[#00FFC6]/10 text-[#00FFC6]"
                  : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]",
              ].join(" ")}
            >
              Draft
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search releases…"
                className="w-[260px] rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-white/90 placeholder:text-white/40 backdrop-blur-md outline-none transition focus:border-[#00FFC6]/60 focus:ring-2 focus:ring-[#00FFC6]/20"
              />
              {query.trim().length > 0 ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-white/50 hover:text-white/80 transition"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              ) : null}
            </div>

            <Link
              href="/artist/releases/create"
              className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm font-semibold text-white/90 backdrop-blur transition hover:bg-white/[0.06] hover:border-[#00FFC6]/60 hover:shadow-[0_0_0_1px_rgba(0,255,198,0.25),0_20px_60px_rgba(0,255,198,0.15)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60"
            >
              <Plus
                size={16}
                strokeWidth={2.5}
                className="text-white/70 transition group-hover:text-white/90"
              />
              <span className="tracking-tight">Create Release</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mt-8">
        {loading ? (
          <div className="grid gap-6 sm:gap-7 lg:gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 animate-pulse"
              >
                <div className="rounded-xl border border-white/10 bg-white/[0.04] overflow-hidden">
                  <div className="aspect-square" />
                </div>

                <div className="mt-4 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-white/[0.06]" />
                  <div className="h-3 w-1/2 rounded bg-white/[0.05]" />
                  <div className="h-3 w-1/3 rounded bg-white/[0.04]" />
                </div>
              </div>
            ))}
          </div>
        ) : releases.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">
            <p className="text-base font-medium">No releases yet</p>
            <p className="mt-1 text-sm text-[#B3B3B3]">
              Create your first release to start uploading tracks.
            </p>
            <div className="mt-5">
              <Link
                href="/artist/releases/create"
                className="inline-flex items-center px-4 py-2 rounded-xl bg-[#00FFC6] text-black font-semibold hover:bg-[#00E0B0] transition"
              >
                Create Release
              </Link>
            </div>
          </div>
        ) : visibleReleases.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">
            <p className="text-base font-medium">No matches</p>
            <p className="mt-1 text-sm text-[#B3B3B3]">
              Try a different search or change the status filter.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuery("")}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/[0.06]"
              >
                Clear search
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/[0.06]"
              >
                Show all
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 sm:gap-7 lg:gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {visibleReleases.map((release) => {
              const dateLabel = new Date(release.created_at).toLocaleDateString();

              return (
                <Link
                  key={release.id}
                  href={`/artist/releases/${release.id}`}
                  className="group relative rounded-2xl bg-white/[0.02] p-4 transition hover:bg-white/[0.04] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_18px_50px_rgba(0,0,0,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60"
                >
                  {/* Cover */}
                  <div className="relative overflow-hidden rounded-xl border border-white/5 bg-gradient-to-b from-white/[0.04] to-white/[0.02]">
                    <div className="aspect-square">
                      {release.cover_url ? (
                        <img
                          src={release.cover_url}
                          alt={`${release.title} cover`}
                          className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.03] group-hover:brightness-[1.02]"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs text-[#B3B3B3]">
                          No Cover
                        </div>
                      )}
                    </div>

                    {/* Type pill */}
                    <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-white/75 backdrop-blur">
                      {release.release_type}
                    </div>
                  </div>

                  {/* Text */}
                  <div className="mt-4 min-w-0">
                    <div className="text-base font-semibold leading-snug line-clamp-2">
                      {release.title}
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="text-sm text-[#B3B3B3]">{dateLabel}</div>

                      {/* Visual-only status (no new data) */}
                      <div className="inline-flex items-center gap-2">
                        <span
                          className={[
                            "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur",
                            release.status === "published"
                              ? "border-[#00FFC6]/40 bg-[#00FFC6]/10 text-[#00FFC6]"
                              : "border-white/10 bg-black/20 text-white/70",
                          ].join(" ")}
                        >
                          {release.status === "published" ? "Live" : "Draft"}
                        </span>
                      </div>
                    </div>

                    {/* subtle affordance */}
                    <div className="mt-4 flex items-center justify-between text-xs text-white/60 transition opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                      <span>Open release</span>
                      <span className="text-[#00FFC6]/80">Edit</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

