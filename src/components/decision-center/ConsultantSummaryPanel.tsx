import { Sparkles } from "lucide-react";
import type { ArtistDecisionPayload } from "@/components/decision-center/types";

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

type SummaryBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string };

type SummarySection = {
  heading: string | null;
  paragraphs: string[];
};

function parseSummaryBlocks(value: string): SummaryBlock[] {
  const lines = value.split(/\r?\n/);
  const blocks: SummaryBlock[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    blocks.push({
      type: "paragraph",
      text: paragraphLines.join(" "),
    });
    paragraphLines = [];
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (trimmed.length === 0) {
      flushParagraph();
      continue;
    }

    const headingMatch = trimmed.match(/^#{1,6}\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      const headingText = headingMatch[1].trim();
      if (headingText.length > 0) {
        blocks.push({ type: "heading", text: headingText });
      }
      continue;
    }

    paragraphLines.push(trimmed);
  }

  flushParagraph();
  return blocks;
}

function buildSummarySections(blocks: SummaryBlock[]): SummarySection[] {
  const sections: SummarySection[] = [];
  let currentSection: SummarySection | null = null;

  for (const block of blocks) {
    if (block.type === "heading") {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        heading: block.text,
        paragraphs: [],
      };
      continue;
    }

    if (!currentSection) {
      currentSection = {
        heading: null,
        paragraphs: [],
      };
    }

    currentSection.paragraphs.push(block.text);
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

export function ConsultantSummaryPanel({
  payload,
  consultantSummaryText,
}: {
  payload: ArtistDecisionPayload;
  consultantSummaryText?: string | null;
}) {
  const readinessText = payload.release_readiness?.text;
  const trackStatusLabel = payload.track_status?.label;
  const trackStatusText = payload.track_status?.text;
  const hasConsultantSummary = hasText(consultantSummaryText);
  const summarySections = hasConsultantSummary
    ? buildSummarySections(parseSummaryBlocks(consultantSummaryText))
    : [];

  return (
    <section
      id="consultant-summary"
      className="overflow-hidden rounded-[2rem] border border-[#00FFC6]/18 bg-[linear-gradient(135deg,rgba(0,255,198,0.09),rgba(255,255,255,0.035)_34%,rgba(255,255,255,0.018))] p-6 shadow-2xl shadow-black/25 md:p-8"
    >
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#00FFC6]/20 bg-[#00FFC6]/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#00FFC6]">
          <Sparkles className="h-3.5 w-3.5" />
          AI Consultant Summary
        </div>

        {hasConsultantSummary ? (
          <div className="mt-5 max-w-4xl space-y-5">
            {summarySections.map((section, index) => (
              <div
                key={`summary-section-${index}`}
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 md:px-5 md:py-5"
              >
                {section.heading ? (
                  <h3 className="text-lg font-semibold tracking-[-0.015em] text-white md:text-xl">
                    {section.heading}
                  </h3>
                ) : null}

                <div className={section.heading ? "mt-3 space-y-3" : "space-y-3"}>
                  {section.paragraphs.map((paragraph, paragraphIndex) => (
                    <p
                      key={`summary-paragraph-${index}-${paragraphIndex}`}
                      className="text-[15px] leading-7 text-zinc-300 md:text-base"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-5 max-w-4xl text-base leading-7 text-zinc-200 md:text-lg">
            The AI Consultant summary has not been generated for this local track
            yet.
          </p>
        )}

        {hasText(readinessText) || hasText(trackStatusText) ? (
          <div className="mt-6 max-w-3xl rounded-2xl border border-white/10 bg-black/20 p-4">
            {hasText(readinessText) ? (
              <p className="text-sm leading-6 text-zinc-400">{readinessText}</p>
            ) : null}

            {hasText(trackStatusLabel) ? (
              <p className="mb-2 mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                {trackStatusLabel}
              </p>
            ) : null}

            {hasText(trackStatusText) ? (
              <p className="text-sm leading-6 text-zinc-400">{trackStatusText}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
