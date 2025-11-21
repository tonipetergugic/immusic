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
    <div className="min-h-screen bg-[#0E0E10] text-white p-8">
      <h1 className="text-3xl font-bold mb-6">Artist Dashboard</h1>

      {/* Upload Section */}
      <Link
        href="/artist/upload"
        className="block rounded-xl border border-zinc-800 bg-zinc-900/60 px-6 py-6 hover:bg-zinc-800 transition"
      >
        <h2 className="text-lg font-semibold mb-1">Upload Track</h2>
        <p className="text-sm text-zinc-400">Upload your new track here</p>
      </Link>

      {/* Track List */}
      <div className="p-4 bg-[#1A1A1A] rounded-xl">
        <h2 className="text-xl font-semibold mb-2">Your Tracks</h2>
        <p className="text-[#B3B3B3]">Track list coming soon...</p>
      </div>
    </div>
  );
}
