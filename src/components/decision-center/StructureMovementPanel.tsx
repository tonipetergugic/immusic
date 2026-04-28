type StructureMovementPanelProps = {
  analysis: unknown;
};

type MovementItem = {
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

  const materialReturn = describeMaterialReturn(
    toFiniteNumber(structure?.repetition_score),
  );
  const contrast = describeContrast(toFiniteNumber(structure?.contrast_score));
  const transitions = describeTransitions(
    toFiniteNumber(structure?.transition_score),
  );

  const items = [materialReturn, contrast, transitions];

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
          Structure & Movement
        </p>

        <h2 className="mt-2 text-lg font-semibold text-white">
          How the track moves
        </h2>

        <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">
          A simple artist-facing view of repetition, contrast, and transition
          clarity. These are listening hints, not final judgments.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-white/10 bg-black/20 p-4"
          >
            <p className="text-sm font-medium text-zinc-300">{item.title}</p>
            <p className="mt-2 text-base font-semibold text-white">
              {item.label}
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
