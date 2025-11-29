export const dynamic = "force-dynamic";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import CoverUploadClient from "./CoverUploadClient";
import { updateReleaseTitleAction } from "./actions";
import TrackListClient from "./TrackListClient";

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
      <div className="bg-[#0E0E10] text-white p-10">
        <h1 className="text-2xl font-bold">Release not found</h1>
      </div>
    );
  }

  const { data: tracks, error: tracksError } = await supabase
    .from("tracks")
    .select("*")
    .eq("release_id", release.id)
    .order("created_at", { ascending: true });

  let signedCoverUrl: string | null = null;

  if (release.cover_path) {
    const { data: signed } = await supabase.storage
      .from("release_covers")
      .createSignedUrl(release.cover_path, 3600);

    signedCoverUrl = signed?.signedUrl ?? null;
  }

  return (
    <div className="bg-[#0E0E10] text-white p-10 flex flex-col gap-8 overflow-y-auto min-h-full">
      <h1 className="text-2xl font-bold mb-4">Edit Release</h1>

      <div className="text-white/60">
        <p>ID: {release.id}</p>
        <p>Status: {release.status}</p>
        <p>Title: {release.title}</p>
      </div>

      <form action={updateReleaseTitleAction} className="mt-6 space-y-4">
        <input type="hidden" name="release_id" value={release.id} />

        <input
          type="text"
          name="title"
          defaultValue={release.title}
          className="w-full max-w-md px-4 py-2 rounded-lg bg-[#1A1A1D] text-white outline-none"
          placeholder="Release Title"
          required
        />

        <button
          type="submit"
          className="px-5 py-2 rounded-xl bg-[#00FFC6] text-black font-medium"
        >
          Save Title
        </button>
      </form>

      {signedCoverUrl && (
        <img
          src={signedCoverUrl}
          alt="Release Cover"
          className="w-48 h-48 rounded-xl object-cover mb-6"
        />
      )}

      <CoverUploadClient
        releaseId={release.id}
        userId={release.user_id}
        currentCoverPath={release.cover_path}
        currentCoverUrl={signedCoverUrl}
      />

      {tracksError && (
        <p className="mt-6 text-red-500">Failed to load tracks.</p>
      )}
      <TrackListClient tracks={tracks || []} />
    </div>
  );
}
