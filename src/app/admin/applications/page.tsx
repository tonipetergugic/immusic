import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { approveApplication, rejectApplication } from "./action";

export default async function AdminApplicationsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  // 🟦 Artist Applications laden
  const { data: applications, error } = await supabase
    .from("artist_applications")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <div className="p-8 text-white max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Pending Artist Applications</h1>

      {applications && applications.length > 0 ? (
        <div className="flex flex-col gap-4">
          {applications.map((app) => (
            <div
              key={app.id}
              className="border border-[#222] rounded-lg p-4 bg-[#0F0F11]"
            >
              <p><strong>Artist Name:</strong> {app.artist_name}</p>
              <p><strong>Full Name:</strong> {app.full_name}</p>
              <p><strong>Country:</strong> {app.country}</p>
              <p><strong>Genre:</strong> {app.genre}</p>
              <p className="text-xs text-zinc-500 mt-2">
                Submitted: {new Date(app.created_at).toLocaleString()}
              </p>

              <div className="flex gap-3 mt-4">
              <form action={approveApplication.bind(null, app.user_id, app.id)}>
                  <button className="px-4 py-2 rounded bg-green-500 text-black font-semibold hover:bg-green-400 transition">
                    Approve
                  </button>
                </form>

                <form action={rejectApplication.bind(null, app.id)}>
                  <button className="px-4 py-2 rounded bg-red-500 text-black font-semibold hover:bg-red-400 transition">
                    Reject
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-zinc-400">No pending applications.</p>
      )}
    </div>
  );
}
