import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/supabase/getUser";
import { getProfile } from "@/lib/supabase/getProfile";

export default async function ArtistDashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const profile = await getProfile();
  if (!profile || (profile.role !== "artist" && profile.role !== "admin")) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#0E0E10] text-white px-6 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">
            Artist Dashboard
          </h1>
          <p className="text-sm text-neutral-400 mb-8">
            Manage your tracks, stats and artist tools.
          </p>
        </header>

        <div className="space-y-8">
          {/* Dashboard Navigation */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Upload Track */}
            <Link
              href="/artist/upload"
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-6 py-6 hover:bg-zinc-800 transition"
            >
              <h2 className="text-lg font-semibold mb-1">Upload Track</h2>
              <p className="text-sm text-zinc-400">Upload your new track</p>
            </Link>

            {/* Your Tracks */}
            <Link
              href="/artist/dashboard/tracks"
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-6 py-6 hover:bg-zinc-800 transition"
            >
              <h2 className="text-lg font-semibold mb-1">Your Tracks</h2>
              <p className="text-sm text-zinc-400">
                Manage your uploaded tracks
              </p>
            </Link>

            {/* Artist Profile */}
            <Link
              href="/artist/dashboard/profile"
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-6 py-6 hover:bg-zinc-800 transition"
            >
              <h2 className="text-lg font-semibold mb-1">Artist Profile</h2>
              <p className="text-sm text-zinc-400">Edit your public profile</p>
            </Link>

            {/* Analytics */}
            <Link
              href="/artist/dashboard/analytics"
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-6 py-6 hover:bg-zinc-800 transition"
            >
              <h2 className="text-lg font-semibold mb-1">Analytics</h2>
              <p className="text-sm text-zinc-400">View track analytics</p>
            </Link>
          </section>

          {/* Placeholder for content */}
          <section className="rounded-xl bg-[#1A1A1A] p-6 mb-8">
            <h2 className="text-xl font-semibold mb-3">Overview</h2>
            <p className="text-sm text-[#B3B3B3]">
              More features coming soon...
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
