import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type ModerationReportRow = {
  id: string;
  track_id: string;
  reporter_user_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by_user_id: string | null;
  tracks: { title: string } | { title: string }[] | null;
};

type ModerationProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
};

type ModerationTrackRow = {
  id: string;
  title: string | null;
  artist_id: string | null;
};

function formatReason(reason: string) {
  return reason
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getTrackTitle(
  tracks: ModerationReportRow["tracks"]
): string {
  if (Array.isArray(tracks)) {
    return tracks[0]?.title ?? "Unknown track";
  }

  return tracks?.title ?? "Unknown track";
}

async function updateTrackReportStatus(formData: FormData) {
  "use server";

  const reportId = String(formData.get("reportId") ?? "");
  const nextStatus = String(formData.get("nextStatus") ?? "");

  if (!reportId) {
    throw new Error("Missing report ID.");
  }

  if (nextStatus !== "dismissed" && nextStatus !== "resolved") {
    throw new Error("Invalid report status.");
  }

  const supabase = await createSupabaseServerClient();
  const supabaseAdmin = getSupabaseAdmin();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (profile?.role !== "admin") {
    throw new Error("Forbidden.");
  }

  if (nextStatus === "dismissed") {
    const { error: deleteError } = await supabaseAdmin
      .from("track_reports")
      .delete()
      .eq("id", reportId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }
  } else {
    const { error: updateError } = await supabaseAdmin
      .from("track_reports")
      .update({
        status: nextStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by_user_id: user.id,
      } as never)
      .eq("id", reportId);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  revalidatePath("/dashboard/admin/moderation");
}

export default async function AdminModerationPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const supabaseAdmin = getSupabaseAdmin();
  const awaitedSearchParams = (await searchParams) ?? {};
  const activeStatus =
    awaitedSearchParams.status === "resolved" ? "resolved" : "open";

  const { data, error } = await supabase
    .from("track_reports")
    .select("id, track_id, reporter_user_id, reason, details, status, created_at, reviewed_at, reviewed_by_user_id, tracks(title)")
    .eq("status", activeStatus)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const reports = (data ?? []) as ModerationReportRow[];

  const reporterIds = Array.from(
    new Set(reports.map((report) => report.reporter_user_id).filter(Boolean))
  );
  const reviewerIds = Array.from(
    new Set(reports.map((report) => report.reviewed_by_user_id).filter(Boolean))
  ) as string[];

  let reporterById = new Map<string, ModerationProfileRow>();

  const trackIds = Array.from(
    new Set(reports.map((report) => report.track_id).filter(Boolean))
  );

  let trackById = new Map<string, ModerationTrackRow>();

  const profileIds = Array.from(new Set([...reporterIds, ...reviewerIds]));

  if (profileIds.length > 0) {
    const { data: profileRows, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, email")
      .in("id", profileIds);

    if (profilesError) {
      throw new Error(profilesError.message);
    }

    reporterById = new Map(
      ((profileRows ?? []) as ModerationProfileRow[]).map((profile) => [
        profile.id,
        profile,
      ])
    );
  }

  if (trackIds.length > 0) {
    const { data: trackRows, error: tracksError } = await supabaseAdmin
      .from("tracks")
      .select("id, title, artist_id")
      .in("id", trackIds);

    if (tracksError) {
      throw new Error(tracksError.message);
    }

    trackById = new Map(
      ((trackRows ?? []) as ModerationTrackRow[]).map((track) => [
        track.id,
        track,
      ])
    );
  }

  const artistIds = Array.from(
    new Set(
      Array.from(trackById.values())
        .map((track) => track.artist_id)
        .filter(Boolean)
    )
  ) as string[];

  let artistById = new Map<string, ModerationProfileRow>();

  if (artistIds.length > 0) {
    const { data: artistRows, error: artistsError } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, email")
      .in("id", artistIds);

    if (artistsError) {
      throw new Error(artistsError.message);
    }

    artistById = new Map(
      ((artistRows ?? []) as ModerationProfileRow[]).map((artist) => [
        artist.id,
        artist,
      ])
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Moderation</h2>
            <p className="mt-2 text-sm text-[#B3B3B3]">
              {activeStatus === "open" ? "Open" : "Resolved"} track reports · {reports.length}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/admin/moderation?status=open"
              className={`rounded-xl border px-3 py-2 text-sm transition ${
                activeStatus === "open"
                  ? "border-white/20 bg-white/10 text-white"
                  : "border-white/10 bg-white/5 text-[#B3B3B3] hover:bg-white/10 hover:text-white"
              }`}
            >
              Open
            </Link>

            <Link
              href="/dashboard/admin/moderation?status=resolved"
              className={`rounded-xl border px-3 py-2 text-sm transition ${
                activeStatus === "resolved"
                  ? "border-white/20 bg-white/10 text-white"
                  : "border-white/10 bg-white/5 text-[#B3B3B3] hover:bg-white/10 hover:text-white"
              }`}
            >
              Resolved
            </Link>
          </div>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-[#B3B3B3]">
            No {activeStatus} track reports.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {reports.map((report) => {
            const reporter = reporterById.get(report.reporter_user_id);
            const reporterName =
              reporter?.display_name?.trim() ||
              reporter?.email?.trim() ||
              report.reporter_user_id;
            const reporterEmail =
              reporter?.email?.trim() &&
              reporter.email.trim() !== reporterName
                ? reporter.email.trim()
                : null;
            const reviewer =
              report.reviewed_by_user_id
                ? reporterById.get(report.reviewed_by_user_id)
                : null;
            const reviewerName =
              reviewer?.display_name?.trim() ||
              reviewer?.email?.trim() ||
              report.reviewed_by_user_id ||
              null;
            const trackRow = trackById.get(report.track_id);
            const artist =
              trackRow?.artist_id ? artistById.get(trackRow.artist_id) : null;
            const artistName =
              artist?.display_name?.trim() ||
              artist?.email?.trim() ||
              trackRow?.artist_id ||
              "Unknown artist";

            return (
            <div
              key={report.id}
              className="rounded-xl border border-white/10 bg-white/5 p-5"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-white">
                    {getTrackTitle(report.tracks)}
                  </h3>
                  <p className="mt-1 text-sm text-[#B3B3B3]">
                    {formatReason(report.reason)}
                  </p>
                </div>

                <div className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                  {report.status}
                </div>
              </div>

              <div className="mt-4 h-px w-full bg-white/10" />

              <div className="mt-5 grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#B3B3B3]">
                    Reporter
                  </p>
                  <p className="mt-1 text-sm font-medium text-white/90 break-all">
                    {reporterName}
                  </p>
                  {reporterEmail ? (
                    <p className="mt-1 text-sm text-[#B3B3B3] break-all">
                      {reporterEmail}
                    </p>
                  ) : null}
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-[#B3B3B3]">
                    Created
                  </p>
                  <p className="mt-1 text-sm text-white/85">
                    {new Date(report.created_at).toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-[#B3B3B3]">
                    Track ID
                  </p>
                  <p className="mt-1 text-sm text-white/85 break-all">
                    {report.track_id}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-[#B3B3B3]">
                    Artist
                  </p>
                  <p className="mt-1 text-sm text-white/85 break-all">
                    {artistName}
                  </p>
                </div>

                {activeStatus === "resolved" ? (
                  <>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-[#B3B3B3]">
                        Reviewed by
                      </p>
                      <p className="mt-1 text-sm text-white/85 break-all">
                        {reviewerName ?? "Unknown admin"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-wide text-[#B3B3B3]">
                        Reviewed at
                      </p>
                      <p className="mt-1 text-sm text-white/85">
                        {report.reviewed_at
                          ? new Date(report.reviewed_at).toLocaleString()
                          : "—"}
                      </p>
                    </div>
                  </>
                ) : null}
              </div>

              {report.details ? (
                <div className="mt-5 border-t border-white/10 pt-4">
                  <p className="text-xs uppercase tracking-wide text-[#B3B3B3]">
                    Details
                  </p>
                  <p className="mt-1 text-sm text-white/85 whitespace-pre-wrap">
                    {report.details}
                  </p>
                </div>
              ) : null}

              {activeStatus === "open" ? (
                <div className="mt-5 flex justify-end gap-2 border-t border-white/10 pt-4">
                  <form action={updateTrackReportStatus}>
                    <input type="hidden" name="reportId" value={report.id} />
                    <input type="hidden" name="nextStatus" value="dismissed" />
                    <button
                      type="submit"
                      className="cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                    >
                      Dismiss
                    </button>
                  </form>

                  <form action={updateTrackReportStatus}>
                    <input type="hidden" name="reportId" value={report.id} />
                    <input type="hidden" name="nextStatus" value="resolved" />
                    <button
                      type="submit"
                      className="cursor-pointer rounded-xl border border-[#00FFC6]/25 bg-[#00FFC6]/10 px-3 py-1.5 text-xs font-medium text-[#CFFFF4] transition hover:bg-[#00FFC6]/14 hover:border-[#00FFC6]/40"
                    >
                      Resolve
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

