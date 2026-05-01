type StructureMovementPanelProps = {
  analysis: unknown;
};

type MovementItem = {
  title: string;
  label: string;
  text: string;
};

type ArrangementFlowItem = {
  title: string;
  label: string;
  text: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function toFiniteNumber(value: unknown): number | null {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function getStructureRecord(analysis: unknown) {
  const analysisRecord = asRecord(analysis);
  return asRecord(analysisRecord?.structure);
}

function asText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function movementProfileLabel(profile: string): string {
  if (profile === "combined_lift") return "Coherent lift";
  if (profile === "energy_lift_with_limited_density_lift") return "Energy lift to verify";
  if (profile === "density_lift_with_limited_energy_lift") return "Density lift to verify";
  if (profile === "variable_without_clear_lift") return "Development check";
  if (profile === "mostly_stable") return "Forward-motion check";
  if (profile === "mixed_motion") return "Mixed movement";
  return "Listening check";
}

function buildArrangementFlowItems(analysis: unknown): ArrangementFlowItem[] {
  const analysisRecord = asRecord(analysis);
  const consultantInput = asRecord(analysisRecord?.consultant_input);
  const musicalFlowSummary = asRecord(consultantInput?.musical_flow_summary);
  const arrangementDevelopmentSummary = asRecord(
    consultantInput?.arrangement_development_summary,
  );

  const items: ArrangementFlowItem[] = [];

  const movementProfile = asText(musicalFlowSummary?.movement_profile);
  const movementListeningCheck = asText(musicalFlowSummary?.listening_check);

  if (movementProfile || movementListeningCheck) {
    items.push({
      title: "Energy and density movement",
      label: movementProfile ? movementProfileLabel(movementProfile) : "Listening check",
      text:
        movementListeningCheck ||
        "Use a focused listening pass to confirm that the arrangement flow feels intentional over time.",
    });
  }

  const hasExtendedCoreSpan =
    arrangementDevelopmentSummary?.possible_extended_core_arrangement_span === true;

  if (hasExtendedCoreSpan) {
    const evidence = asRecord(
      arrangementDevelopmentSummary?.extended_core_arrangement_span_evidence,
    );
    const startTime = asText(evidence?.start_time);
    const endTime = asText(evidence?.end_time);
    const arrangementListeningCheck = asText(
      arrangementDevelopmentSummary?.listening_check,
    );
    const fallbackText =
      "Check whether this central section develops enough through variation, tension, or a clear lift.";

    const text =
      startTime && endTime
        ? `Around ${startTime}–${endTime}, one central arrangement area may be worth a focused listening check: ${arrangementListeningCheck || fallbackText}`
        : arrangementListeningCheck || fallbackText;

    items.push({
      title: "Central arrangement span",
      label: "Focused check",
      text,
    });
  }

  return items.slice(0, 2);
}

function describeMaterialReturn(score: number | null): MovementItem {
  if (score === null) {
    return {
      title: "Material return",
      label: "Not available yet",
      text: "The current analysis does not include enough structure data for this part.",
    };
  }

  if (score >= 0.7) {
    return {
      title: "Material return",
      label: "Strong recurring identity",
      text: "Core musical material appears to return clearly. This can support memorability, but it may be worth checking whether the track still develops enough over time.",
    };
  }

  if (score >= 0.45) {
    return {
      title: "Material return",
      label: "Balanced movement",
      text: "The track appears to reuse musical material without feeling overly static from the structure data alone.",
    };
  }

  return {
    title: "Material return",
    label: "More forward movement",
    text: "The track seems to move away from earlier material more often. Check by listening whether that feels intentional and coherent.",
  };
}

function describeContrast(score: number | null): MovementItem {
  if (score === null) {
    return {
      title: "Part contrast",
      label: "Not available yet",
      text: "The current analysis does not include enough structure data for this part.",
    };
  }

  if (score >= 0.55) {
    return {
      title: "Part contrast",
      label: "Clearly separated parts",
      text: "The main parts appear structurally distinct. This can help the listener feel progression and change.",
    };
  }

  if (score >= 0.28) {
    return {
      title: "Part contrast",
      label: "Moderate contrast",
      text: "The track shows some structural contrast between parts. A listening pass should confirm whether the changes feel strong enough for the genre.",
    };
  }

  return {
    title: "Part contrast",
    label: "Subtle contrast",
    text: "The main parts appear relatively close in structural shape. This is not automatically a problem, but it may be worth checking if the track needs a clearer change moment.",
  };
}

function describeTransitions(score: number | null): MovementItem {
  if (score === null) {
    return {
      title: "Transitions",
      label: "Not available yet",
      text: "The current analysis does not include enough structure data for this part.",
    };
  }

  if (score >= 0.7) {
    return {
      title: "Transitions",
      label: "Clear change points",
      text: "The main transitions appear clear in the structure data. This suggests the arrangement changes are easy to follow.",
    };
  }

  if (score >= 0.5) {
    return {
      title: "Transitions",
      label: "Mostly stable",
      text: "The main transitions look generally stable. A listening pass should confirm whether they feel smooth and intentional.",
    };
  }

  return {
    title: "Transitions",
    label: "Worth checking",
    text: "Some transitions may be less clearly defined. It may be useful to listen closely to whether the main changes land with enough intention.",
  };
}

export function StructureMovementPanel({
  analysis,
}: StructureMovementPanelProps) {
  const structure = getStructureRecord(analysis);
  const arrangementFlowItems = buildArrangementFlowItems(analysis);

  const materialReturn = describeMaterialReturn(
    toFiniteNumber(structure?.repetition_score),
  );
  const contrast = describeContrast(toFiniteNumber(structure?.contrast_score));
  const transitions = describeTransitions(
    toFiniteNumber(structure?.transition_score),
  );

  const items = [materialReturn, contrast, transitions];

  return (
    <section className="rounded-[2rem] border border-[#00FFC6]/15 bg-[linear-gradient(135deg,rgba(0,255,198,0.06),rgba(255,255,255,0.025)_34%,rgba(255,255,255,0.015))] p-6 shadow-2xl shadow-black/20 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#00FFC6]/80">
            Structure & Movement
          </p>

          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white md:text-3xl">
            How the track moves
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            A calm artist-facing view of repetition, contrast, and transition
            clarity. These are listening hints, not final judgments.
          </p>
        </div>

        <div className="hidden rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-medium text-zinc-500 md:block">
          Arrangement feel
        </div>
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-3">
        {items.map((item) => (
          <article
            key={item.title}
            className="rounded-3xl border border-white/10 bg-black/20 p-5"
          >
            <div className="h-1 w-10 rounded-full bg-[#00FFC6]" />

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              {item.title}
            </p>

            <h3 className="mt-3 text-lg font-semibold tracking-[-0.025em] text-white">
              {item.label}
            </h3>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {item.text}
            </p>
          </article>
        ))}
      </div>

      {arrangementFlowItems.length > 0 ? (
        <div className="mt-8 rounded-3xl border border-white/10 bg-black/20 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Arrangement flow checks
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            These checks translate the current arrangement evidence into focused
            listening points. They are not hard judgments.
          </p>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {arrangementFlowItems.map((item) => (
              <article
                key={item.title}
                className="rounded-3xl border border-white/10 bg-black/20 p-5"
              >
                <div className="h-1 w-10 rounded-full bg-[#00FFC6]" />

                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  {item.title}
                </p>

                <h3 className="mt-3 text-lg font-semibold tracking-[-0.025em] text-white">
                  {item.label}
                </h3>

                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  {item.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
