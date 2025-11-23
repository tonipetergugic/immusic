import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import ArtistTracksTable from "@/components/ArtistTracksTable";

export default async function ArtistTracksPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="text-white p-6">Not logged in.</div>;
  }

  // Get profile to read artist_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "artist" && profile.role !== "admin")) {
    return <div className="text-white p-6">No artist access.</div>;
  }

  // Get tracks for this artist
  const { data: tracks, error } = await supabase
    .from("tracks")
    .select("*")
    .eq("artist_id", profile.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Track fetch error:", error);
  }

  const normalizedTracks =
    tracks?.map((t) => ({
      ...t,
      created_at: t.created_at ? new Date(t.created_at).toISOString() : null,
    })) ?? [];

  return (
    <main className="min-h-screen bg-[#0E0E10] text-white px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">
          Your Tracks
        </h1>
        <p className="text-sm text-neutral-400 mb-8">
          All tracks you've uploaded to ImMusic.
        </p>

        <div className="space-y-8">
          <section className="mb-8">
            <ArtistTracksTable tracks={normalizedTracks} />
          </section>
        </div>
      </div>
    </main>
  );
}

