import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ReleasesClient, { type ReleaseRecord } from "./_components/ReleasesClient";

export default async function ReleasesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("releases")
    .select("id, title, release_type, cover_path, cover_preview_path, created_at, status")
    .eq("artist_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  if (!data) {
    return <ReleasesClient initialReleases={[]} />;
  }

  const initialReleases: ReleaseRecord[] = data.map((r) => {
    const preferredCoverPath = r.cover_preview_path ?? r.cover_path ?? null;

    return {
      ...r,
      cover_url: preferredCoverPath
        ? supabase.storage.from("release_covers").getPublicUrl(preferredCoverPath).data.publicUrl
        : null,
    };
  });

  return <ReleasesClient initialReleases={initialReleases} />;
}