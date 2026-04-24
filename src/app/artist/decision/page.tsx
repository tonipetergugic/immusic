export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { FileText, GitBranch, ShieldCheck } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatTrackTitle } from "@/lib/formatTrackTitle";
import { readFeedbackState } from "@/lib/ai/track-check/read-feedback-state";
import { buildArtistDecisionPayload } from "@/lib/ai/decision-center/artistDecisionPayload";
import DecisionTrackSwitcher from "./components/DecisionTrackSwitcher";
import { ActiveDecisionTrackCard } from "./components/ActiveDecisionTrackCard";
import { ArtistDecisionSummaryCard } from "./components/ArtistDecisionSummaryCard";
import { DecisionCenterEmptyState } from "./components/DecisionCenterEmptyState";
import { DecisionCenterHeader } from "./components/DecisionCenterHeader";
import { DecisionTechnicalDetails } from "./components/DecisionTechnicalDetails";

type ProfileRoleRow = {
  id: string;
  role: string | null;
};

type DecisionTrackRow = {
  id: string;
  title: string | null;
  version: string | null;
  genre: string | null;
  status: string | null;
  source_queue_id: string | null;
  created_at: string | null;
};

const connectedBlocks = [
  "decision_summary",
  "decision_rule_context",
  "decision_trace",
  "explanation_inputs",
  "wording_payload",
  "consultant_payload",
];

export default async function ArtistDecisionPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>;
}) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle<ProfileRoleRow>();

  if (profileError) {
    throw profileError;
  }

  if (!profile) {
    throw new Error("Profile not found.");
  }

  if (profile.role !== "artist" && profile.role !== "admin") {
    redirect("/artist/onboarding");
  }

  const sp = await searchParams;
  const requestedTrackId = (sp?.track ?? "").trim();

  const { data: trackRows, error: tracksError } = await supabase
    .from("tracks")
    .select("id, title, version, genre, status, source_queue_id, created_at")
    .eq("artist_id", user.id)
    .in("status", ["approved", "development", "performance"])
    .order("created_at", { ascending: false });

  if (tracksError) {
    throw tracksError;
  }

  const tracks = (trackRows ?? []) as DecisionTrackRow[];

  const selectedTrack =
    tracks.find((track) => track.id === requestedTrackId) ?? tracks[0] ?? null;

  const selectedTrackIndex = selectedTrack
    ? tracks.findIndex((track) => track.id === selectedTrack.id)
    : -1;

  const previousTrack =
    selectedTrackIndex > 0 ? tracks[selectedTrackIndex - 1] : null;

  const nextTrack =
    selectedTrackIndex >= 0 && selectedTrackIndex < tracks.length - 1
      ? tracks[selectedTrackIndex + 1]
      : null;

  const feedbackState =
    selectedTrack?.source_queue_id
      ? await readFeedbackState({
          supabase,
          userId: user.id,
          queueId: selectedTrack.source_queue_id,
        })
      : null;

  const artistDecisionPayload = buildArtistDecisionPayload(
    feedbackState && "payload" in feedbackState ? feedbackState.payload : undefined
  );

  return (
    <div className="w-full text-white">
      <div className="w-full space-y-10">
        <div className="border-b border-white/10 pb-8">
          <DecisionCenterHeader />
        </div>

        {tracks.length > 0 && selectedTrack ? (
          <ActiveDecisionTrackCard
            selectedTrackTitle={formatTrackTitle(selectedTrack.title, selectedTrack.version)}
            selectedTrackIndex={selectedTrackIndex}
            trackCount={tracks.length}
            selectedTrackStatus={selectedTrack.status}
            selectedTrackGenre={selectedTrack.genre}
            selectedTrackQueueId={selectedTrack.source_queue_id}
            previousTrack={previousTrack}
            nextTrack={nextTrack}
          />
        ) : null}

        <section className="border-b border-white/10 pb-10">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-[#00FFC6]" />
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Active track context
            </h2>
          </div>
          <p className="mt-2 text-sm text-[#B3B3B3]">
            The Decision Center is the main artist surface for track decisions. Use the active track navigation above or the track switcher on the left to move between tracks.
          </p>

          {tracks.length === 0 ? (
            <DecisionCenterEmptyState />
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
              <DecisionTrackSwitcher
                tracks={tracks}
                selectedTrackId={selectedTrack?.id ?? null}
              />

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                  Active decision view
                </div>

                <div className="mt-4">
                  <h3 className="text-2xl font-semibold tracking-tight text-white">
                    {formatTrackTitle(selectedTrack?.title, selectedTrack?.version)}
                  </h3>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/55">
                    <span className="rounded-full border border-white/10 px-3 py-1">
                      Status: {selectedTrack?.status ?? "unknown"}
                    </span>
                    <span className="rounded-full border border-white/10 px-3 py-1">
                      Genre: {selectedTrack?.genre ?? "No genre"}
                    </span>
                    <span className="rounded-full border border-white/10 px-3 py-1">
                      Queue linked: {selectedTrack?.source_queue_id ? "Yes" : "No"}
                    </span>
                  </div>

                  <ArtistDecisionSummaryCard artistDecisionPayload={artistDecisionPayload} />

                  <DecisionTechnicalDetails
                    selectedTrack={selectedTrack}
                    feedbackState={feedbackState}
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="border-b border-white/10 pb-10">
          <div className="flex items-center gap-3">
            <GitBranch className="h-5 w-5 text-[#00FFC6]" />
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Current system status
            </h2>
          </div>
          <p className="mt-2 text-sm text-[#B3B3B3]">
            The Decision Center is no longer only a shell. These blocks are already connected for the selected track.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {connectedBlocks.map((block) => (
              <div
                key={block}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4"
              >
                <div className="text-sm font-medium text-white/90">{block}</div>
                <div className="mt-1 text-xs text-[#B8FFF0]">Connected</div>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-4">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-[#00FFC6]" />
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Feedback integration
            </h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#B3B3B3]">
            The old feedback flow will not remain the main product surface. Relevant feedback content will later be attached to this Decision Center in a controlled way.
          </p>
        </section>
      </div>
    </div>
  );
}
