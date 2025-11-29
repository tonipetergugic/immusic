export const dynamic = "force-dynamic";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ReleaseEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // In Next.js 15 MUST await params
  const { id: releaseId } = await params;

  const supabase = await createSupabaseServerClient();

  const { data: release, error } = await supabase
    .from("releases")
    .select("*")
    .eq("id", releaseId)
    .single();

  if (error || !release) {
    return (
      <div className="min-h-screen bg-[#0E0E10] text-white p-10">
        <h1 className="text-2xl font-bold">Release not found</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E0E10] text-white p-10">
      <h1 className="text-2xl font-bold mb-4">Edit Release</h1>

      <div className="text-white/60">
        <p>ID: {release.id}</p>
        <p>Status: {release.status}</p>
        <p>Title: {release.title}</p>
      </div>
    </div>
  );
}
