"use client";

import Link from "next/link";
import { Plus, Disc3, Search } from "lucide-react";
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
  const statusFilters = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "withdrawn", label: "Withdrawn" },
] as const;
const [statusFilter, setStatusFilter] = useState<
  (typeof statusFilters)[number]["value"]
>("all");

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
            : statusFilter === "withdrawn"
            ? s === "withdrawn"
            : statusFilter === "draft"
            ? s === "draft"
            : false;

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
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-3 text-4xl font-semibold tracking-tight text-white">
              <Disc3 className="h-7 w-7 text-[#00FFC6]" />
              My <span className="text-[#00FFC6]">Releases</span>
            </h1>

            <p className="mt-2 text-[15px] text-[#B3B3B3]">
              Manage your releases, covers and details.
            </p>
          </div>

          <Link
            href="/artist/releases/create"
            className="
              inline-flex shrink-0 items-center gap-2
              rounded-xl px-4 py-2
              text-sm font-semibold
              text-[#00FFC6]
              bg-black/40
              border border-[#00FFC6]/40
              transition
              hover:bg-black/60
              hover:border-[#00FFC6]/70
            "
          >
            <Plus className="h-4 w-4" />
            New Release
          </Link>
        </div>

        <div className="flex flex-col gap-y-5 lg:flex-row lg:items-end lg:justify-between lg:gap-x-8">
          <div className="inline-flex flex-wrap items-center gap-x-8 gap-y-3">
            {statusFilters.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={[
                  "relative cursor-pointer text-[15px] font-semibold tracking-tight transition-colors",
                  statusFilter === value
                    ? value === "published"
                      ? "text-[#00FFC6]"
                      : value === "draft"
                      ? "text-white/85"
                      : "text-white"
                    : "text-white/55 hover:text-white/80",
                ].join(" ")}
              >
                {label}
                <span
                  className={[
                    "pointer-events-none absolute left-0 -bottom-2.5 h-[3px] w-full rounded-full transition-opacity",
                    statusFilter === value
                      ? value === "published"
                        ? "opacity-100 bg-[#00FFC6]"
                        : value === "draft"
                        ? "opacity-100 bg-white/35"
                        : "opacity-100 bg-white/70"
                      : "opacity-0",
                  ].join(" ")}
                />
              </button>
            ))}
          </div>

          <div className="w-full max-w-[520px]">
            <div className="flex items-center gap-3 border-b border-white/15 pb-2 transition focus-within:border-[#00FFC6]/40">
              <Search className="h-4 w-4 text-white/45" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search releases…"
                className="w-full bg-transparent text-[15px] text-white placeholder:text-white/40 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="mt-8">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="aspect-square w-full rounded-lg bg-white/10 animate-pulse" />
                <div className="mt-2.5 h-3.5 w-2/3 rounded-md bg-white/10 animate-pulse" />
                <div className="mt-1.5 h-3 w-1/3 rounded-md bg-white/10 animate-pulse" />
              </div>
            ))}
          </div>
        ) : visibleReleases.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/80 font-semibold">No releases found</p>
            <p className="mt-2 text-[15px] text-[#B3B3B3]">
              Create your first release to start uploading tracks.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {visibleReleases.map((r) => (
              <Link
                key={r.id}
                href={`/artist/releases/${r.id}`}
                className={[
                  "group rounded-2xl border bg-white/[0.03] p-4 transition",
                  String(r.status ?? "draft") === "published"
                    ? "border-[#00FFC6]/25 hover:border-[#00FFC6]/45 hover:bg-[#00FFC6]/[0.06]"
                    : String(r.status ?? "draft") === "withdrawn"
                    ? "border-white/25 hover:border-white/45 hover:bg-white/[0.06]"
                    : "border-white/10 hover:border-white/20 hover:bg-white/[0.05]",
                ].join(" ")}
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-white/10 bg-black/40">
                  {r.release_type ? (
                    <div className="pointer-events-none absolute top-3 right-3 z-10 rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold tracking-widest text-white/90 border border-white/10 backdrop-blur">
                      {String(r.release_type).toUpperCase()}
                    </div>
                  ) : null}

                  {r.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.cover_url}
                      alt={r.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/30">
                      <Disc3 className="h-8 w-8" />
                    </div>
                  )}
                </div>

                <div className="mt-3.5">
                  <div>
                    <p className="truncate text-[15px] font-semibold tracking-tight text-white">{r.title}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
