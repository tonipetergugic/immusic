import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/getUser";
import { getProfile } from "@/lib/supabase/getProfile";

export default async function ArtistDashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const profile = await getProfile();
  if (!profile || profile.role !== "artist") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#0E0E10] text-white p-8">
      <h1 className="text-3xl font-bold mb-6">Artist Dashboard</h1>

      {/* Upload Section */}
      <div className="p-4 bg-[#1A1A1A] rounded-xl mb-6">
        <h2 className="text-xl font-semibold mb-2">Upload Track</h2>
        <p className="text-[#B3B3B3]">Upload section coming soon...</p>
      </div>

      {/* Track List */}
      <div className="p-4 bg-[#1A1A1A] rounded-xl">
        <h2 className="text-xl font-semibold mb-2">Your Tracks</h2>
        <p className="text-[#B3B3B3]">Track list coming soon...</p>
      </div>
    </div>
  );
}
