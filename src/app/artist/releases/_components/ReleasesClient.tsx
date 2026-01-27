"use client";

import Link from "next/link";
import { Plus, Disc3 } from "lucide-react";
import { useMemo, useState } from "react";

export type ReleaseRecord = {
  id: string;
  title: string;
  release_type: string;
  cover_path: string | null;
  created_at: string;
  status?: string | null;
  cover_url?: string | null;
};

export default function ReleasesClient({ initialReleases }: { initialReleases: ReleaseRecord[] }) {
  const [releases] = useState<ReleaseRecord[]>(initialReleases);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");

  const visibleReleases = useMemo(() => {
    return releases
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
  }, [releases, query, statusFilter]);

  const loading = false;

  return (
    <div className="w-full max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="flex items-center gap-3 text-4xl font-semibold tracking-tight text-white">
            <Disc3 className="h-7 w-7 text-[#00FFC6]" />
            My Releases
          </h1>
          <p className="mt-2 text-sm text-[#B3B3B3]">Manage your releases, covers and details.</p>
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
              Published
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
              Drafts
            </button>
          </div>

          <Link
            href="/artist/releases/create"
            className="inline-flex items-center gap-2 rounded-xl bg-[#00FFC6] px-4 py-2 text-sm font-semibold text-black hover:bg-[#00E0B0] transition"
          >
            <Plus className="h-4 w-4" />
            New Release
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="mt-6 flex items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search releases…"
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-[#00FFC6]/40"
        />
      </div>

      {/* Grid */}
      <div className="mt-8">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="aspect-square w-full rounded-xl bg-white/10 animate-pulse" />
                <div className="mt-4 h-4 w-2/3 rounded bg-white/10 animate-pulse" />
                <div className="mt-2 h-3 w-1/3 rounded bg-white/10 animate-pulse" />
              </div>
            ))}
          </div>
        ) : visibleReleases.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <p className="text-white/80 font-semibold">No releases found</p>
            <p className="mt-2 text-sm text-[#B3B3B3]">
              Create your first release to start uploading tracks.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleReleases.map((r) => (
              <Link
                key={r.id}
                href={`/artist/releases/${r.id}`}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.06] transition"
              >
                <div className="aspect-square w-full overflow-hidden rounded-xl border border-white/10 bg-black/40">
                  {r.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.cover_url}
                      alt={r.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/30">
                      <Disc3 className="h-10 w-10" />
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-semibold text-white">{r.title}</p>
                    <span
                      className={[
                        "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                        String(r.status ?? "draft") === "published"
                          ? "border-[#00FFC6]/40 bg-[#00FFC6]/10 text-[#00FFC6]"
                          : "border-white/10 bg-white/[0.02] text-white/60",
                      ].join(" ")}
                    >
                      {String(r.status ?? "draft") === "published" ? "Published" : "Draft"}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-[#B3B3B3]">{r.release_type}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
