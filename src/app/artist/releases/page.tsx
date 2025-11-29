import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ReleasesPage() {
  const supabase = await createSupabaseServerClient();

  // Aktuellen User holen
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="text-white px-6 py-6">Not authenticated.</div>;
  }

  // Alle Releases des Artists laden
  const { data: releases, error } = await supabase
    .from("releases")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Release load error:", error);
    return <div className="text-white px-6 py-6">Failed to load releases.</div>;
  }

  return (
    <div className="w-full">
      <h1 className="text-2xl font-semibold mb-8">Your Releases</h1>

      {releases.length === 0 ? (
        <p className="text-white/60">You haven’t created any releases yet.</p>
      ) : (
        <div
          className="
            grid 
            grid-cols-2 
            sm:grid-cols-3 
            md:grid-cols-4 
            lg:grid-cols-5 
            xl:grid-cols-6 
            gap-6
          "
        >
          {releases.map((release) => (
            <Link
              key={release.id}
              href={`/artist/releases/${release.id}`}
              className="
                group 
                flex flex-col 
                items-center 
                text-center 
                hover:opacity-90 
                transition
              "
            >
              <div
                className="
                  w-full 
                  aspect-square 
                  rounded-lg 
                  overflow-hidden 
                  bg-[#1A1A1D]
                  border 
                  border-white/10
                "
              >
                {release.cover_path ? (
                  <img
                    src={release.cover_path}
                    alt={release.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/40 text-sm">
                    No Cover
                  </div>
                )}
              </div>

              <p className="text-sm mt-3 font-medium text-white w-full truncate">
                {release.title}
              </p>

              <p className="text-xs text-white/40 truncate w-full">
                {new Date(release.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
