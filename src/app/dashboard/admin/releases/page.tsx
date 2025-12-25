import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import HomeReleasesDndItem from "./HomeReleasesDndItem";
import HomeReleasesDndList from "./HomeReleasesDndList";
import AvailableReleasesSearch from "./AvailableReleasesSearch";
import CoverPlaceholder from "@/components/CoverPlaceholder";

async function addReleaseToHome(releaseId: string) {
  "use server";

  const supabase = await createSupabaseServerClient();

  const { data: maxPos } = await supabase
    .from("home_module_items")
    .select("position")
    .eq("module_id", "c1bb3c1a-e995-43b4-9c14-a2af566ea279")
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const nextPosition = (maxPos?.position ?? 0) + 1;

  const { data: rel, error: relError } = await supabase
    .from("releases")
    .select("title")
    .eq("id", releaseId)
    .single();

  if (relError || !rel?.title) {
    throw new Error("Failed to load release title for home insert.");
  }

  await supabase.from("home_module_items").insert({
    module_id: "c1bb3c1a-e995-43b4-9c14-a2af566ea279",
    item_type: "release",
    item_id: releaseId,
    item_title: rel.title,
    position: nextPosition,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin/releases");
}

async function removeReleaseFromHome(releaseId: string) {
  "use server";

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("home_module_items")
    .delete()
    .eq("module_id", "c1bb3c1a-e995-43b4-9c14-a2af566ea279")
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
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const sp = await searchParams;

  const qRaw = Array.isArray(sp?.q) ? sp?.q[0] : sp?.q;
  const q = (qRaw ?? "").toLowerCase().trim();

  const supabase = await createSupabaseServerClient();

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
    .eq("module_id", "c1bb3c1a-e995-43b4-9c14-a2af566ea279")
    .eq("item_type", "release")
    .order("position", { ascending: true });

  if (homeItemsError) {
    throw new Error(
      `home_module_items query failed: ${homeItemsError.message} (${homeItemsError.code})`
    );
  }

  const featuredIds = new Set((homeItems ?? []).map((r) => r.item_id));

  const { data: releases, error: releasesError } = await supabase
    .from("releases")
    .select("id, title, status, release_date, cover_path, profiles:artist_id(display_name)")
    .order("created_at", { ascending: false });

  if (releasesError) {
    throw new Error(
      `releases query failed: ${releasesError.message} (${releasesError.code})`
    );
  }

  const homeReleases =
    homeItems
      ?.map((item) => {
        const release = releases?.find((rel) => rel.id === item.item_id);
        if (!release) return null;

        return { ...release, homeItemId: item.id, position: item.position };
      })
      .filter((rel): rel is NonNullable<typeof rel> => Boolean(rel)) ?? [];

  const availableReleases =
    releases?.filter((release) => !featuredIds.has(release.id)) ?? [];

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
      <h2 className="text-lg font-semibold mb-3">Home: Push Releases</h2>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-white">
              On Home ({homeReleases.length})
            </h2>
            <p className="text-xs text-white/60">
              Drag to reorder. Only items on Home are sortable.
            </p>
          </div>

          {homeReleases.length > 0 ? (
            <HomeReleasesDndList
              moduleId="c1bb3c1a-e995-43b4-9c14-a2af566ea279"
              initialOrder={homeReleases.map((x) => x.homeItemId)}
            >
              {homeReleases.map((release) => {
                const artistName =
                  (Array.isArray(release?.profiles)
                    ? release?.profiles?.[0]?.display_name
                    : (release as any)?.profiles?.display_name) ?? "";
                const coverSrc = getReleaseCoverSrc((release as any).cover_path);

                return (
                <HomeReleasesDndItem key={release.homeItemId} id={release.homeItemId}>
                  <form
                    key={release.id}
                    action={async () => {
                      "use server";
                      await addReleaseToHome(release.id);
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
                        <div className="text-xs text-[#B3B3B3]">{release.status}</div>
                      </div>
                    </div>

                    {featuredIds.has(release.id) ? (
                      <button
                        type="submit"
                        formAction={async () => {
                          "use server";
                          await removeReleaseFromHome(release.id);
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
                </HomeReleasesDndItem>
              );
            })}
            </HomeReleasesDndList>
          ) : null}
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Available ({filteredAvailableReleases.length})
              </h2>
              <p className="text-xs text-white/60">
                Search and add releases to Home.
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
                    await addReleaseToHome(release.id);
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
                        await removeReleaseFromHome(release.id);
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
