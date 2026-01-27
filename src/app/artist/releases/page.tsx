import { createSupabaseServerClient } from "@/lib/supabase/server";
import ReleasesClient, { type ReleaseRecord } from "./_components/ReleasesClient";

export default async function ReleasesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const { data, error } = await supabase
    .from("releases")
    .select("id, title, release_type, cover_path, created_at, status")
    .eq("artist_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return <ReleasesClient initialReleases={[]} />;
  }

  const initialReleases: ReleaseRecord[] = data.map((r) => ({
    ...r,
    cover_url: r.cover_path
      ? supabase.storage.from("release_covers").getPublicUrl(r.cover_path).data.publicUrl
      : null,
  }));

  return <ReleasesClient initialReleases={initialReleases} />;
}