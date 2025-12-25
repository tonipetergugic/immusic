import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import HomePlaylistsDndItem from "./HomePlaylistsDndItem";
import HomePlaylistsDndList from "./HomePlaylistsDndList";
import AvailablePlaylistsSearch from "./AvailablePlaylistsSearch";
import CoverPlaceholder from "@/components/CoverPlaceholder";

async function addPlaylistToHome(playlistId: string) {
  "use server";

  const supabase = await createSupabaseServerClient();

  function getPlaylistCoverSrc(pathOrUrl: string | null | undefined) {
    const v = (pathOrUrl ?? "").trim();
    if (!v) return null;

    // Wenn bereits absolute URL gespeichert ist, direkt nutzen
    if (v.startsWith("http://") || v.startsWith("https://")) return v;

    // Sonst als Storage-Pfad behandeln
    const { data } = supabase.storage.from("playlist-covers").getPublicUrl(v);
    return data?.publicUrl ?? null;
  }

  const { data: maxPos } = await supabase
    .from("home_module_items")
    .select("position")
    .eq("module_id", "366d5c08-f540-4020-a741-3ed320155965")
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const nextPosition = (maxPos?.position ?? 0) + 1;

  const { data: pl, error: plError } = await supabase
    .from("playlists")
    .select("title")
    .eq("id", playlistId)
    .single();

  if (plError || !pl?.title) {
    throw new Error("Failed to load playlist title for home insert.");
  }

  await supabase.from("home_module_items").insert({
    module_id: "366d5c08-f540-4020-a741-3ed320155965",
    item_type: "playlist",
    item_id: playlistId,
    item_title: pl.title,
    position: nextPosition,
  });

  revalidatePath("/dashboard/admin/playlists");
}

async function removePlaylistFromHome(playlistId: string) {
  "use server";

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("home_module_items")
    .delete()
    .eq("module_id", "366d5c08-f540-4020-a741-3ed320155965")
    .eq("item_type", "playlist")
    .eq("item_id", playlistId);

  if (error) {
    throw new Error(`Failed to remove playlist from home: ${error.message} (${error.code})`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin/playlists");
}

export default async function AdminPlaylistsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp?.q ?? "").toLowerCase().trim();

  const supabase = await createSupabaseServerClient();

  const BUCKET_PLAYLIST_COVERS = "playlist-covers";

  function getPlaylistCoverSrc(pathOrUrl: string | null | undefined) {
    const v = (pathOrUrl ?? "").trim();
    if (!v) return null;

    // Wenn bereits absolute URL gespeichert ist, direkt nutzen
    if (v.startsWith("http://") || v.startsWith("https://")) return v;

    // Sonst als Storage-Pfad behandeln
    const { data } = supabase.storage.from(BUCKET_PLAYLIST_COVERS).getPublicUrl(v);
    return data?.publicUrl ?? null;
  }

  function getCreatorName(profiles: any): string {
    if (Array.isArray(profiles)) {
      return profiles?.[0]?.display_name || profiles?.[0]?.email || "";
    }
    return profiles?.display_name || profiles?.email || "";
  }

  const { data: homeItems } = await supabase
    .from("home_module_items")
    .select("id, item_id, position")
    .eq("module_id", "366d5c08-f540-4020-a741-3ed320155965")
    .eq("item_type", "playlist")
    .order("position", { ascending: true });

  const featuredIds = new Set((homeItems ?? []).map((r) => r.item_id));

  const { data: playlists } = await supabase
    .from("playlists")
    .select(
      "id, title, is_public, created_at, cover_url, profiles:created_by(display_name, email)"
    )
    .order("created_at", { ascending: false });

  const homePlaylists =
    homeItems
      ?.map((item) => {
        const playlist = playlists?.find((pl) => pl.id === item.item_id);
        if (!playlist) return null;

        return { ...playlist, homeItemId: item.id, position: item.position };
      })
      .filter((pl): pl is NonNullable<typeof pl> => Boolean(pl)) ?? [];

  const availablePlaylists =
    playlists?.filter((pl) => !featuredIds.has(pl.id)) ?? [];

  const filteredAvailablePlaylists = q
    ? availablePlaylists.filter((pl) => {
        const title = String(pl.title ?? "").toLowerCase();
        const creatorValue = getCreatorName(pl?.profiles).toLowerCase();
        return title.includes(q) || creatorValue.includes(q);
      })
    : availablePlaylists;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="text-lg font-semibold mb-3">Home: Push Playlists</h2>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-white">
              On Home ({homePlaylists.length})
            </h2>
            <p className="text-xs text-white/60">
              Drag to reorder. Only items on Home are sortable.
            </p>
          </div>

          {homePlaylists.length > 0 ? (
            <HomePlaylistsDndList
              moduleId="366d5c08-f540-4020-a741-3ed320155965"
              initialOrder={homePlaylists.map((x) => x.homeItemId)}
            >
              {homePlaylists.map((pl) => {
                const creatorName = getCreatorName(pl?.profiles);
                const coverSrc = getPlaylistCoverSrc(pl.cover_url);

                return (
                  <HomePlaylistsDndItem key={pl.homeItemId} id={pl.homeItemId}>
                    <form
                      key={pl.id}
                      action={async () => {
                        "use server";
                        await addPlaylistToHome(pl.id);
                      }}
                      className="flex items-center justify-between rounded-md bg-black/30 px-3 py-2 min-h-[72px]"
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
                          <div className="text-sm text-white truncate">{pl.title}</div>
                          {creatorName ? (
                            <div className="text-xs text-white/60 truncate">{creatorName}</div>
                          ) : null}
                          <div className="text-xs text-[#B3B3B3]">
                            {pl.is_public ? "public" : "private"}
                          </div>
                        </div>
                      </div>

                      {featuredIds.has(pl.id) ? (
                        <button
                          type="submit"
                          formAction={async () => {
                            "use server";
                            await removePlaylistFromHome(pl.id);
                          }}
                          className="w-24 h-8 self-center text-xs rounded-md flex items-center justify-center bg-red-500/10 text-red-300 hover:bg-red-500/20 transition"
                        >
                          Remove
                        </button>
                      ) : (
                        <button
                          type="submit"
                          className="w-24 h-8 self-center text-xs rounded-md flex items-center justify-center bg-[#00FFC6]/10 text-[#00FFC6] hover:bg-[#00FFC6]/20 transition"
                        >
                          Add to Home
                        </button>
                      )}
                    </form>
                  </HomePlaylistsDndItem>
                );
              })}
            </HomePlaylistsDndList>
          ) : null}
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Available ({filteredAvailablePlaylists.length})
              </h2>
              <p className="text-xs text-white/60">
                Search and add playlists to Home.
              </p>
            </div>
            <AvailablePlaylistsSearch />
          </div>

          <div className="flex flex-col gap-2">
            {filteredAvailablePlaylists.map((pl) => {
              const creatorName = getCreatorName(pl?.profiles);
              const coverSrc = getPlaylistCoverSrc(pl.cover_url);

              return (
                <form
                  key={pl.id}
                  action={async () => {
                    "use server";
                    await addPlaylistToHome(pl.id);
                  }}
                  className="flex items-center justify-between rounded-md bg-black/30 px-3 py-2 min-h-[72px]"
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
                      <div className="text-sm text-white truncate">{pl.title}</div>
                      {creatorName ? (
                        <div className="text-xs text-white/60 truncate">{creatorName}</div>
                      ) : null}
                      <div className="text-xs text-[#B3B3B3]">
                        {pl.is_public ? "public" : "private"}
                      </div>
                    </div>
                  </div>

                  {featuredIds.has(pl.id) ? (
                    <button
                      type="submit"
                      formAction={async () => {
                        "use server";
                        await removePlaylistFromHome(pl.id);
                      }}
                      className="w-24 h-8 self-center text-xs rounded-md flex items-center justify-center bg-red-500/10 text-red-300 hover:bg-red-500/20 transition"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="w-24 h-8 self-center text-xs rounded-md flex items-center justify-center bg-[#00FFC6]/10 text-[#00FFC6] hover:bg-[#00FFC6]/20 transition"
                    >
                      Add to Home
                    </button>
                  )}
                </form>
              );
            })}

            {filteredAvailablePlaylists.length === 0 ? (
              <div className="text-sm text-white/60">No results.</div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
