import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import AvailableReleasesSearch from "./AvailableReleasesSearch";
import CoverPlaceholder from "@/components/CoverPlaceholder";
import HomeReleasesOnHomeWrapper from "./HomeReleasesOnHomeWrapper";

async function getHomeModuleIdByType(supabase: any, moduleType: string) {
  const { data, error } = await supabase
    .from("home_modules")
    .select("id")
    .eq("module_type", moduleType)
    .limit(1);

  if (error) {
    throw new Error(`home_modules query failed: ${error.message} (${error.code})`);
  }

  const id = (data as any[])?.[0]?.id;
  if (!id) {
    throw new Error(`Missing home_modules entry for module_type='${moduleType}'.`);
  }

  return id as string;
}

async function addReleaseToHome(releaseId: string, moduleType: string) {
  "use server";

  const supabase = getSupabaseAdmin();
  const moduleId = await getHomeModuleIdByType(supabase, moduleType);

  const { data: maxRows, error: maxErr } = (await supabase
    .from("home_module_items")
    .select("position")
    .eq("module_id", moduleId)
    .order("position", { ascending: false })
    .limit(1)) as {
      data: { position: number }[] | null;
      error: any;
    };

  if (maxErr) {
    throw new Error(`Failed to load max position: ${maxErr.message} (${maxErr.code})`);
  }

  const nextPosition = (maxRows?.[0]?.position ?? 0) + 1;

  const relResult = (await supabase
    .from("releases")
    .select("title")
    .eq("id", releaseId)
    .single()) as {
      data: { title: string } | null;
      error: any;
    };

  const rel = relResult.data;
  const relError = relResult.error;

  if (relError || !rel?.title) {
    throw new Error("Failed to load release title for home insert.");
  }

  // @ts-expect-error - getSupabaseAdmin() has typing issues with insert
  const { error: insErr } = await supabase.from("home_module_items").insert({
    module_id: moduleId,
    item_type: "release",
    item_id: releaseId,
    item_title: rel.title,
    position: nextPosition,
  });

  if (insErr) {
    throw new Error(`Failed to add release to home: ${insErr.message} (${insErr.code})`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin/releases");
}

async function removeReleaseFromHome(releaseId: string, moduleType: string) {
  "use server";

  const supabase = getSupabaseAdmin();
  const moduleId = await getHomeModuleIdByType(supabase, moduleType);

  const { error } = await supabase
    .from("home_module_items")
    .delete()
    .eq("module_id", moduleId)
    .eq("item_type", "release")
    .eq("item_id", releaseId);

  if (error) {
    throw new Error(
      `Failed to remove release from home: ${error.message} (${error.code})`
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin/releases");
}

export default async function AdminReleasesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; mode?: string | string[] }>;
}) {
  const sp = await searchParams;

  const qRaw = Array.isArray(sp?.q) ? sp?.q[0] : sp?.q;
  const q = (qRaw ?? "").toLowerCase().trim();

  const modeRaw = Array.isArray(sp?.mode) ? sp?.mode[0] : sp?.mode;
  const mode = (modeRaw ?? "development").toLowerCase().trim() === "performance" ? "performance" : "development";
  const moduleType = mode === "performance" ? "performance_release" : "release";

  const supabase = await createSupabaseServerClient();
  const admin = getSupabaseAdmin();
  const moduleId = await getHomeModuleIdByType(admin, moduleType);

  const BUCKET_RELEASE_COVERS = "release_covers";

  function getReleaseCoverSrc(pathOrUrl: string | null | undefined) {
    const v = (pathOrUrl ?? "").trim();
    if (!v) return null;

    if (v.startsWith("http://") || v.startsWith("https://")) return v;

    const { data } = supabase.storage.from(BUCKET_RELEASE_COVERS).getPublicUrl(v);
    return data?.publicUrl ?? null;
  }

  const { data: homeItems, error: homeItemsError } = await supabase
    .from("home_module_items")
    .select("id, item_id, position")
    .eq("module_id", moduleId)
    .eq("item_type", "release")
    .order("position", { ascending: true });

  if (homeItemsError) {
    throw new Error(
      `home_module_items query failed: ${homeItemsError.message} (${homeItemsError.code})`
    );
  }

  const featuredIds = new Set((homeItems ?? []).map((r) => r.item_id));

  // === NACHHER: Performance mode release filter = ONLY releases where ALL tracks are performance-eligible ===
  let performanceReleaseIds: string[] = [];

  if (mode === "performance") {
    const { data: perfRows, error: perfErr } = await supabase
      .from("performance_discovery_candidates")
      .select("release_id, track_id");

    if (perfErr) {
      throw new Error(
        `performance_discovery_candidates query failed: ${perfErr.message} (${perfErr.code})`
      );
    }

    // eligible tracks per release (distinct track_id)
    const eligibleByRelease = new Map<string, Set<string>>();
    for (const row of (perfRows ?? []) as any[]) {
      const rid = row.release_id as string | null;
      const tid = row.track_id as string | null;
      if (!rid || !tid) continue;
      if (!eligibleByRelease.has(rid)) eligibleByRelease.set(rid, new Set());
      eligibleByRelease.get(rid)!.add(tid);
    }

    const candidateReleaseIds = Array.from(eligibleByRelease.keys());

    // If no candidates -> show nothing
    if (candidateReleaseIds.length === 0) {
      performanceReleaseIds = ["00000000-0000-0000-0000-000000000000"]; // safe "no match"
    } else {
      // total tracks per release (distinct track.id) — if a release has any non-eligible track, it must NOT appear
      const { data: trackRows, error: trackErr } = await supabase
        .from("tracks")
        .select("id, release_id")
        .in("release_id", candidateReleaseIds);

      if (trackErr) {
        throw new Error(`tracks query failed: ${trackErr.message} (${trackErr.code})`);
      }

      const totalByRelease = new Map<string, Set<string>>();
      for (const row of (trackRows ?? []) as any[]) {
        const rid = row.release_id as string | null;
        const tid = row.id as string | null;
        if (!rid || !tid) continue;
        if (!totalByRelease.has(rid)) totalByRelease.set(rid, new Set());
        totalByRelease.get(rid)!.add(tid);
      }

      // keep only releases where eligible_count === total_count
      performanceReleaseIds = candidateReleaseIds.filter((rid) => {
        const eligibleCount = eligibleByRelease.get(rid)?.size ?? 0;
        const totalCount = totalByRelease.get(rid)?.size ?? 0;
        return totalCount > 0 && eligibleCount === totalCount;
      });

      // If none fully eligible -> show nothing
      if (performanceReleaseIds.length === 0) {
        performanceReleaseIds = ["00000000-0000-0000-0000-000000000000"]; // safe "no match"
      }
    }
  }

  const releasesQuery = supabase
    .from("releases")
    .select("id, title, status, release_date, cover_path, profiles:artist_id(display_name)")
    .order("created_at", { ascending: false });

  const { data: releases, error: releasesError } =
    mode === "performance"
      ? await releasesQuery.in("id", performanceReleaseIds)
      : await releasesQuery;

  if (releasesError) {
    throw new Error(
      `releases query failed: ${releasesError.message} (${releasesError.code})`
    );
  }

  const releaseIds = (releases ?? []).map((r: any) => r.id).filter(Boolean);

  // Load track status per release to filter development vs performance releases
  const { data: tracksByRelease, error: tracksByReleaseErr } = await supabase
    .from("tracks")
    .select("release_id,status")
    .in("release_id", releaseIds);

  if (tracksByReleaseErr) {
    throw new Error(
      `tracks query failed: ${tracksByReleaseErr.message} (${tracksByReleaseErr.code})`
    );
  }

  const hasPerformance = new Set<string>();
  const hasDevelopment = new Set<string>();

  for (const t of (tracksByRelease ?? []) as any[]) {
    const rid = t.release_id as string | null;
    const st = String(t.status ?? "");
    if (!rid) continue;

    if (st === "performance") hasPerformance.add(rid);
    if (st === "development") hasDevelopment.add(rid);
  }

  // Mode comes from your existing UI toggle logic.
  // If your variable name is different (e.g. `mode`), keep it consistent.
  const eligibleReleaseIds =
    mode === "performance"
      ? new Set((releases ?? []).map((r: any) => r.id).filter((id: string) => hasPerformance.has(id)))
      : new Set((releases ?? []).map((r: any) => r.id).filter((id: string) => !hasPerformance.has(id)));

  const homeReleasesAll =
    homeItems
      ?.map((item) => {
        const release = releases?.find((rel) => rel.id === item.item_id);
        if (!release) return null;

        return { ...release, homeItemId: item.id, position: item.position };
      })
      .filter((rel): rel is NonNullable<typeof rel> => Boolean(rel)) ?? [];

  const homeReleases = homeReleasesAll.filter((r) => eligibleReleaseIds.has(r.id));
  const ineligiblePinned = homeReleasesAll.filter((r) => !eligibleReleaseIds.has(r.id));

  const homeReleasesClient = homeReleases.map((release: any) => {
    const artistName =
      (Array.isArray(release?.profiles)
        ? release?.profiles?.[0]?.display_name
        : (release as any)?.profiles?.display_name) ?? null;

    const coverSrc = getReleaseCoverSrc((release as any).cover_path);

    return {
      id: release.id,
      title: release.title ?? null,
      status: release.status ?? null,
      cover_src: coverSrc,
      artist_name: artistName,
      homeItemId: release.homeItemId,
      position: release.position,
    };
  });

  const availableReleases =
    releases?.filter((release) => !featuredIds.has(release.id) && eligibleReleaseIds.has(release.id)) ?? [];

  const filteredAvailableReleases = q
    ? availableReleases.filter((release) => {
        const titleValue = String(release.title ?? "").toLowerCase();

        const artistValue = String(
          (Array.isArray(release?.profiles)
            ? release?.profiles?.[0]?.display_name
            : (release as any)?.profiles?.display_name) ?? ""
        ).toLowerCase();
        return titleValue.includes(q) || artistValue.includes(q);
      })
    : availableReleases;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="text-lg font-semibold mb-3">Home: Featured Releases</h2>

      <div className="mb-4 flex items-center gap-2">
        <a
          href={`/dashboard/admin/releases?mode=development${q ? `&q=${encodeURIComponent(qRaw ?? "")}` : ""}`}
          className={[
            "px-4 py-2 rounded-full text-sm font-semibold border transition",
            mode === "development"
              ? "bg-[#0B1614] text-white/90 border-[#00FFC655] shadow-[0_0_18px_rgba(0,255,198,0.18)]"
              : "bg-transparent text-white/70 border-white/10 hover:text-white/90",
          ].join(" ")}
        >
          Development
        </a>

        <a
          href={`/dashboard/admin/releases?mode=performance${q ? `&q=${encodeURIComponent(qRaw ?? "")}` : ""}`}
          className={[
            "px-4 py-2 rounded-full text-sm font-semibold border transition",
            mode === "performance"
              ? "bg-[#0B1614] text-white/90 border-[#00FFC655] shadow-[0_0_18px_rgba(0,255,198,0.18)]"
              : "bg-transparent text-white/70 border-white/10 hover:text-white/90",
          ].join(" ")}
        >
          Performance
        </a>

        <span className="text-xs text-white/50 ml-2">
          Module: <span className="text-white/70">{moduleType}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-white">
              Featured (Pinned) ({homeReleases.length})
            </h2>
            <p className="text-xs text-white/60">
              These releases appear first on Home. Drag to reorder.
            </p>
          </div>

          {ineligiblePinned.length > 0 ? (
            <div className="mb-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
              <div className="text-xs font-semibold text-yellow-200">
                Not eligible for this mode ({ineligiblePinned.length})
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {ineligiblePinned.map((release) => {
                  const artistName =
                    (Array.isArray(release?.profiles)
                      ? release?.profiles?.[0]?.display_name
                      : (release as any)?.profiles?.display_name) ?? "";
                  const coverSrc = getReleaseCoverSrc((release as any).cover_path);

                  return (
                    <form
                      key={release.id}
                      action={async () => {
                        "use server";
                        await removeReleaseFromHome(release.id, moduleType);
                      }}
                      className="flex items-center justify-between rounded-md bg-black/30 px-3 py-2"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {coverSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={coverSrc}
                            alt=""
                            className="h-12 w-12 shrink-0 rounded-md object-cover border border-white/10"
                            loading="lazy"
                          />
                        ) : (
                          <CoverPlaceholder size={48} />
                        )}

                        <div className="min-w-0">
                          <div className="text-sm text-white truncate">{release.title}</div>
                          {artistName ? (
                            <div className="text-xs text-white/60 truncate">{artistName}</div>
                          ) : null}
                          <div className="text-[11px] text-yellow-200/70">
                            Hidden in this mode — remove it from Home.
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-24 h-8 text-xs rounded-md flex items-center justify-center bg-red-500/10 text-red-300 hover:bg-red-500/20 transition"
                      >
                        Remove
                      </button>
                    </form>
                  );
                })}
              </div>
            </div>
          ) : null}

          {homeReleasesClient.length > 0 ? (
            <HomeReleasesOnHomeWrapper
              moduleId={moduleId}
              homeReleases={homeReleasesClient}
              onRemove={async (releaseId) => {
                "use server";
                await removeReleaseFromHome(releaseId, moduleType);
              }}
            />
          ) : null}
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Available ({filteredAvailableReleases.length})
              </h2>
              <p className="text-xs text-white/60">
                Search releases and pin them to appear first. Home will auto-fill the rest with newest releases.
              </p>
            </div>

            <AvailableReleasesSearch />
          </div>

          <div className="flex flex-col gap-2">
            {filteredAvailableReleases.map((release) => {
              const artistName =
                (Array.isArray(release?.profiles)
                  ? release?.profiles?.[0]?.display_name
                  : (release as any)?.profiles?.display_name) ?? "";
              const coverSrc = getReleaseCoverSrc((release as any).cover_path);

              return (
                <form
                  key={release.id}
                  action={async () => {
                    "use server";
                    await addReleaseToHome(release.id, moduleType);
                  }}
                  className="flex items-center justify-between rounded-md bg-black/30 px-3 py-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {coverSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coverSrc}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-md object-cover border border-white/10"
                        loading="lazy"
                      />
                    ) : (
                      <CoverPlaceholder size={56} />
                    )}

                    <div className="min-w-0">
                      <div className="text-sm text-white truncate">{release.title}</div>
                      {artistName ? (
                        <div className="text-xs text-white/60 truncate">{artistName}</div>
                      ) : null}
                      <div className="text-xs text-[#B3B3B3]">
                        {release.status}
                      </div>
                    </div>
                  </div>

                  {featuredIds.has(release.id) ? (
                    <button
                      type="submit"
                      formAction={async () => {
                        "use server";
                        await removeReleaseFromHome(release.id, moduleType);
                      }}
                      className="w-24 h-8 text-xs rounded-md flex items-center justify-center bg-red-500/10 text-red-300 hover:bg-red-500/20 transition"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="w-24 h-8 text-xs rounded-md flex items-center justify-center bg-[#00FFC6]/10 text-[#00FFC6] hover:bg-[#00FFC6]/20 transition"
                    >
                      Add to Home
                    </button>
                  )}
                </form>
              );
            })}
          </div>

          {filteredAvailableReleases.length === 0 ? (
            <div className="mt-3 text-sm text-white/60">No results.</div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
