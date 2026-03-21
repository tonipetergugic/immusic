"use client";

import { useRouter } from "next/navigation";

type Variant =
  | "running"
  | "queued"
  | "timeout"
  | "error"
  | "approvedWithCredits"
  | "approvedNoCredits"
  | "rejectedWithCredits"
  | "rejectedNoCredits"
  | "duplicate";

function ProcessingStateCard({ variant }: { variant: Variant }) {
  const router = useRouter();

  const isRunning = variant === "running" || variant === "queued";

  const visualStatuses = [
    "Preparing analysis…",
    "Checking audio quality…",
    "Inspecting technical details…",
    "Finalizing result…",
  ];

  const activeVisualStatus =
    variant === "queued" ? "Queued for processing…" : visualStatuses[2];

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.025)_48%,rgba(255,255,255,0.02)_100%)] p-6 text-left shadow-[0_30px_100px_rgba(0,0,0,0.45)] ring-1 ring-white/5 backdrop-blur-xl sm:p-7">
      {isRunning ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <p className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                {activeVisualStatus}
              </p>

              <p className="mt-3 max-w-xl text-sm leading-6 text-white/60 sm:text-base">
                {variant === "queued"
                  ? "Queued… processing will start shortly."
                  : "Processing your track…"}
              </p>
            </div>

            <div className="relative mt-1 h-5 w-5 shrink-0">
              <span className="absolute inset-0 rounded-full border border-white/15" />
              <span className="absolute inset-0 rounded-full bg-[#00FFC6]/20 blur-[6px]" />
              <span className="absolute inset-0 animate-ping rounded-full bg-[#00FFC6]/25" />
              <span className="absolute inset-[4px] rounded-full bg-[#00FFC6]" />
            </div>
          </div>

          <div className="mt-8">
            <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
              <div className="processing-bar h-full w-1/3 rounded-full bg-[#00FFC6]" />
            </div>
          </div>

          <p className="mt-auto pt-6 text-center text-sm text-white/70 sm:text-[15px]">
            Do not close this page — your track is currently being processed.
          </p>
        </div>
      ) : null}

      {variant === "timeout" ? (
        <div className="flex min-h-0 flex-1 flex-col text-center">
          <p className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Taking longer than expected.
          </p>

          <div className="mt-auto flex flex-col justify-center gap-3.5 pt-5 sm:flex-row">
            <button
              type="button"
              className="rounded-2xl border border-[#00FFC6]/60 px-6 py-3 font-semibold text-[#00FFC6] bg-transparent transition hover:-translate-y-[1px] hover:border-[#00FFC6] hover:bg-[#00FFC6]/10 hover:shadow-[0_10px_30px_rgba(0,255,198,0.15)] cursor-pointer"
            >
              Retry Processing
            </button>

            <button
              type="button"
              className="rounded-2xl border border-white/12 bg-white/[0.03] px-6 py-3 font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:-translate-y-[1px] hover:border-white/20 hover:bg-white/[0.05] cursor-pointer"
              onClick={() => router.replace("/artist/upload")}
            >
              Back to Upload
            </button>
          </div>
        </div>
      ) : null}

      {variant === "error" ? (
        <div className="flex min-h-0 flex-1 flex-col text-center">
          <p className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Processing <span className="text-red-400">failed</span>. Please try again.
          </p>

          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/65 sm:text-lg">
            We could not complete the next step for this track.
          </p>

          <div className="mt-auto flex justify-center pt-6">
            <button
              type="button"
              className="rounded-2xl border border-white/12 bg-white/[0.03] px-6 py-3 font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:-translate-y-[1px] hover:border-white/20 hover:bg-white/[0.05] cursor-pointer"
              onClick={() => router.replace("/artist/upload")}
            >
              Back to Upload
            </button>
          </div>
        </div>
      ) : null}

      {variant === "duplicate" ? (
        <div className="flex min-h-0 flex-1 flex-col text-center text-white/70">
          <p className="mb-4 text-xl font-semibold tracking-tight text-white/95 sm:text-2xl">
            This audio already exists on IMUSIC. Uploading it again is not allowed.
          </p>

          <div className="mt-auto flex flex-col justify-center gap-3.5 pt-5 sm:flex-row">
            <button
              type="button"
              className="rounded-2xl border border-white/12 bg-white/[0.03] px-6 py-3 font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:-translate-y-[1px] hover:border-white/20 hover:bg-white/[0.05] cursor-pointer"
              onClick={() => router.replace("/artist/upload")}
            >
              Back to Upload
            </button>
            <button
              type="button"
              className="rounded-2xl border border-[#00FFC6]/60 px-6 py-3 font-semibold text-[#00FFC6] bg-transparent transition hover:-translate-y-[1px] hover:border-[#00FFC6] hover:bg-[#00FFC6]/10 hover:shadow-[0_10px_30px_rgba(0,255,198,0.15)] cursor-pointer"
              onClick={() => router.replace("/artist/my-tracks")}
            >
              Go to My Tracks
            </button>
          </div>
        </div>
      ) : null}

      {variant === "approvedWithCredits" ? (
        <div className="flex min-h-0 flex-1 flex-col text-center">
          <p className="mb-4 text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Track <span className="text-[#00FFC6]">approved</span>. You may publish.
          </p>

          <div className="mt-auto flex flex-col justify-center gap-3.5 pt-5 sm:flex-row">
            <button
              type="button"
              className="rounded-2xl border border-white/12 bg-white/[0.03] px-6 py-3 font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:-translate-y-[1px] hover:border-white/20 hover:bg-white/[0.05] cursor-pointer"
              onClick={() => router.replace("/artist/my-tracks")}
            >
              Go to My Tracks
            </button>

            <button
              type="button"
              className="rounded-2xl border border-[#00FFC6]/60 px-6 py-3 font-semibold text-[#00FFC6] bg-transparent transition hover:-translate-y-[1px] hover:border-[#00FFC6] hover:bg-[#00FFC6]/10 hover:shadow-[0_10px_30px_rgba(0,255,198,0.15)] cursor-pointer"
            >
              Detailed AI Analysis (10 Credits)
            </button>
          </div>
        </div>
      ) : null}

      {variant === "approvedNoCredits" ? (
        <div className="flex min-h-0 flex-1 flex-col text-center">
          <p className="mb-4 text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Track <span className="text-[#00FFC6]">approved</span>. You may publish.
          </p>

          <p className="mt-3 text-base text-white/75 sm:text-lg">
            Detailed AI analysis requires{" "}
            <span className="font-semibold text-white/85">10 credits</span>.
          </p>

          <div className="mt-auto flex flex-col justify-center gap-3.5 pt-5 sm:flex-row">
            <button
              type="button"
              className="rounded-2xl border border-white/12 bg-white/[0.03] px-6 py-3 font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:-translate-y-[1px] hover:border-white/20 hover:bg-white/[0.05] cursor-pointer"
              onClick={() => router.replace("/artist/my-tracks")}
            >
              Go to My Tracks
            </button>

            <button
              type="button"
              className="rounded-2xl border border-[#00FFC6]/60 px-6 py-3 font-semibold text-[#00FFC6] bg-transparent transition hover:-translate-y-[1px] hover:border-[#00FFC6] hover:bg-[#00FFC6]/10 hover:shadow-[0_10px_30px_rgba(0,255,198,0.15)] cursor-pointer"
            >
              Buy Credits
            </button>
          </div>
        </div>
      ) : null}

      {variant === "rejectedWithCredits" ? (
        <div className="flex min-h-0 flex-1 flex-col text-center text-white/70">
          <p className="mb-5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Track <span className="text-red-400">rejected</span>. Detailed AI analysis is available for this upload.
          </p>

          <div className="mt-auto flex flex-col justify-center gap-3.5 pt-5 sm:flex-row">
            <button
              type="button"
              className="rounded-2xl border border-white/12 bg-white/[0.03] px-6 py-3 font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:-translate-y-[1px] hover:border-white/20 hover:bg-white/[0.05] cursor-pointer"
              onClick={() => router.replace("/artist/upload")}
            >
              Back to Upload
            </button>

            <button
              type="button"
              className="rounded-2xl border border-[#00FFC6]/60 px-6 py-3 font-semibold text-[#00FFC6] bg-transparent transition hover:-translate-y-[1px] hover:border-[#00FFC6] hover:bg-[#00FFC6]/10 hover:shadow-[0_10px_30px_rgba(0,255,198,0.15)] cursor-pointer"
            >
              Detailed AI Analysis (10 Credits)
            </button>
          </div>
        </div>
      ) : null}

      {variant === "rejectedNoCredits" ? (
        <div className="flex min-h-0 flex-1 flex-col text-center text-white/70">
          <p className="mb-5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Track <span className="text-red-400">rejected</span>. Detailed AI analysis is available for this upload.
          </p>

          <p className="mt-3 text-base text-white/75 sm:text-lg">
            Detailed AI analysis requires{" "}
            <span className="font-semibold text-white/85">10 credits</span>.
          </p>

          <div className="mt-auto flex flex-col justify-center gap-3.5 pt-5 sm:flex-row">
            <button
              type="button"
              className="rounded-2xl border border-white/12 bg-white/[0.03] px-6 py-3 font-semibold text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition hover:-translate-y-[1px] hover:border-white/20 hover:bg-white/[0.05] cursor-pointer"
              onClick={() => router.replace("/artist/upload")}
            >
              Back to Upload
            </button>

            <button
              type="button"
              className="rounded-2xl border border-[#00FFC6]/60 px-6 py-3 font-semibold text-[#00FFC6] bg-transparent transition hover:-translate-y-[1px] hover:border-[#00FFC6] hover:bg-[#00FFC6]/10 hover:shadow-[0_10px_30px_rgba(0,255,198,0.15)] cursor-pointer"
            >
              Buy Credits
            </button>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .processing-bar {
          animation: processing-slide 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          box-shadow: 0 0 24px rgba(0, 255, 198, 0.35);
        }

        @keyframes processing-slide {
          0% {
            transform: translateX(-130%);
          }
          55% {
            transform: translateX(105%);
          }
          100% {
            transform: translateX(280%);
          }
        }
      `}</style>
    </div>
  );
}

const variants: { key: Variant; title: string }[] = [
  { key: "running", title: "Running" },
  { key: "queued", title: "Queued" },
  { key: "approvedWithCredits", title: "Approved · 10+ Credits" },
  { key: "approvedNoCredits", title: "Approved · Under 10 Credits" },
  { key: "rejectedWithCredits", title: "Rejected · 10+ Credits" },
  { key: "rejectedNoCredits", title: "Rejected · Under 10 Credits" },
  { key: "duplicate", title: "Duplicate Reject" },
  { key: "timeout", title: "Timeout" },
  { key: "error", title: "Error" },
];

export default function ProcessingPreviewPage() {
  return (
    <div className="min-h-screen bg-[#0E0E10] px-6 py-10 text-white">
      <div className="mx-auto w-full max-w-6xl">
        <h1 className="mb-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          <span className="text-[#00FFC6]">Processing</span> preview
        </h1>
        <p className="mb-10 text-sm text-white/60 sm:text-base">
          UI-only preview of all processing states for visual review.
        </p>

        <div className="grid grid-cols-1 items-stretch gap-8 xl:grid-cols-2">
          {variants.map((variant) => (
            <section key={variant.key} className="flex h-full w-full flex-col">
              <h2 className="mb-4 shrink-0 text-sm font-semibold uppercase tracking-[0.16em] text-white/45">
                {variant.title}
              </h2>
              <div className="min-h-0 flex-1 flex flex-col">
                <ProcessingStateCard variant={variant.key} />
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
