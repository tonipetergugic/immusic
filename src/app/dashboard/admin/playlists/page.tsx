import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function addPlaylistToHome(playlistId: string) {
  "use server";

  const supabase = await createSupabaseServerClient();

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

export default async function AdminPlaylistsPage() {
  const supabase = await createSupabaseServerClient();

  const { data: featuredRows } = await supabase
    .from("home_module_items")
    .select("item_id")
    .eq("module_id", "366d5c08-f540-4020-a741-3ed320155965")
    .eq("item_type", "playlist");

  const featuredIds = new Set((featuredRows ?? []).map((r) => r.item_id));

  const { data: playlists } = await supabase
    .from("playlists")
    .select("id, title, is_public, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="text-lg font-semibold mb-3">Home: Push Playlists</h2>

      <div className="space-y-2">
        {playlists?.map((pl) => (
          <form
            key={pl.id}
            action={async () => {
              "use server";
              await addPlaylistToHome(pl.id);
            }}
            className="flex items-center justify-between rounded-md bg-black/30 px-3 py-2"
          >
            <div>
              <div className="text-sm text-white">{pl.title}</div>
              <div className="text-xs text-[#B3B3B3]">
                {pl.is_public ? "public" : "private"}
              </div>
            </div>

            {featuredIds.has(pl.id) ? (
              <button
                type="submit"
                formAction={async () => {
                  "use server";
                  await removePlaylistFromHome(pl.id);
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
        ))}
      </div>
    </div>
  );
}
