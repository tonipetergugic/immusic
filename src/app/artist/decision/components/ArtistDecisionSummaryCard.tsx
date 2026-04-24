import type { ArtistDecisionPayload } from "@/lib/ai/decision-center/artistDecisionPayload";

type ArtistDecisionSummaryCardProps = {
  artistDecisionPayload: ArtistDecisionPayload;
};

export function ArtistDecisionSummaryCard({
  artistDecisionPayload,
}: ArtistDecisionSummaryCardProps) {
  return (
    <div className="mt-6 rounded-2xl border border-[#00FFC6]/20 bg-[#00FFC6]/[0.06] px-5 py-5">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B8FFF0]">
        Artist decision summary
      </div>

      <p className="mt-3 text-sm leading-6 text-white/85">
        {artistDecisionPayload.summary}
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <div className="text-sm font-medium text-white/85">
            What works well
          </div>

          {artistDecisionPayload.what_works_well.length > 0 ? (
            <ul className="mt-2 space-y-2 text-sm leading-6 text-white/65">
              {artistDecisionPayload.what_works_well.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm leading-6 text-white/55">
              No clear strength note is available yet.
            </p>
          )}
        </div>

        <div>
          <div className="text-sm font-medium text-white/85">
            Worth checking
          </div>

          {artistDecisionPayload.what_may_be_worth_checking.length > 0 ? (
            <ul className="mt-2 space-y-2 text-sm leading-6 text-white/65">
              {artistDecisionPayload.what_may_be_worth_checking.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm leading-6 text-white/55">
              No major check point is highlighted by the available decision data.
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
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

      {artistDecisionPayload.technical_release_checks.length > 0 ? (
        <div className="mt-5">
          <div className="text-sm font-medium text-white/85">
            Technical release checks
          </div>

          <div className="mt-3 space-y-2">
            {artistDecisionPayload.technical_release_checks.map((check) => (
              <div
                key={`${check.label}-${check.message}`}
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
              >
                <div className="text-sm font-medium text-white/85">
                  {check.label}
                </div>
                <p className="mt-1 text-sm leading-6 text-white/60">
                  {check.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

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
