import type { ArtistDecisionPayload } from "@/lib/ai/decision-center/artistDecisionPayload";

type ArtistDecisionSummaryCardProps = {
  artistDecisionPayload: ArtistDecisionPayload;
};

type ScoreCard = ArtistDecisionPayload["score_cards"][number];

function formatScore(score: ScoreCard["score"]) {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return "—";
  }

  const clampedScore = Math.max(0, Math.min(1, score));
  return `${Math.round(clampedScore * 100)}%`;
}

function formatStatus(status: ScoreCard["status"]) {
  if (status === "pass") return "Strong";
  if (status === "check") return "Check";
  return "Unavailable";
}

function getStatusClassName(status: ScoreCard["status"]) {
  if (status === "pass") {
    return "border-[#00FFC6]/30 bg-[#00FFC6]/10 text-[#B8FFF0]";
  }

  if (status === "check") {
    return "border-yellow-400/25 bg-yellow-400/10 text-yellow-100";
  }

  return "border-white/10 bg-white/[0.03] text-white/45";
}

export function ArtistDecisionSummaryCard({
  artistDecisionPayload,
}: ArtistDecisionSummaryCardProps) {
  return (
    <div className="mt-6 rounded-2xl border border-[#00FFC6]/20 bg-[#00FFC6]/[0.06] px-5 py-5">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B8FFF0]">
        Artist decision summary
      </div>

      <p className="mt-3 max-w-3xl text-base leading-7 text-white/88">
        {artistDecisionPayload.summary}
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {artistDecisionPayload.score_cards.map((card) => (
          <div
            key={card.key}
            className="rounded-2xl border border-white/10 bg-black/20 px-5 py-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-white/90">
                  {card.label}
                </div>

                <div className="mt-3 text-4xl font-semibold tracking-tight text-white">
                  {formatScore(card.score)}
                </div>
              </div>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusClassName(
                  card.status,
                )}`}
              >
                {formatStatus(card.status)}
              </span>
            </div>

            <p className="mt-4 text-sm leading-6 text-white/62">
              {card.explanation}
            </p>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
                Practical hint
              </div>
              <p className="mt-2 text-sm leading-6 text-white/68">
                {card.practical_hint}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
        <div className="text-sm font-medium text-white/85">
          Structure / Movement
        </div>

        <p className="mt-2 text-sm leading-6 text-white/65">
          {artistDecisionPayload.structure_movement.main_message}
        </p>

        {artistDecisionPayload.structure_movement.supporting_points.length > 0 ? (
          <ul className="mt-3 space-y-2 text-sm leading-6 text-white/55">
            {artistDecisionPayload.structure_movement.supporting_points.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="mt-5 border-t border-white/10 pt-4">
        <div className="text-sm font-medium text-white/85">
          Next step
        </div>
        <p className="mt-2 text-sm leading-6 text-white/65">
          {artistDecisionPayload.next_step}
        </p>
      </div>
    </div>
  );
}
