import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

export default async function AdminReleasesPage() {
  const supabase = await createSupabaseServerClient();

  const { data: featuredRows } = await supabase
    .from("home_module_items")
    .select("item_id")
    .eq("module_id", "c1bb3c1a-e995-43b4-9c14-a2af566ea279")
    .eq("item_type", "release");

  const featuredIds = new Set((featuredRows ?? []).map((r) => r.item_id));

  const { data: releases } = await supabase
    .from("releases")
    .select("id, title, status, release_date")
    .order("created_at", { ascending: false });

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="text-lg font-semibold mb-3">Home: Push Releases</h2>

      <div className="space-y-2">
        {releases?.map((release) => (
          <form
            key={release.id}
            action={async () => {
              "use server";
              await addReleaseToHome(release.id);
            }}
            className="flex items-center justify-between rounded-md bg-black/30 px-3 py-2"
          >
            <div>
              <div className="text-sm text-white">{release.title}</div>
              <div className="text-xs text-[#B3B3B3]">
                {release.status}
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
        ))}
      </div>
    </div>
  );
}
