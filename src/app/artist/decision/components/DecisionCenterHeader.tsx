import { Brain } from "lucide-react";

export function DecisionCenterHeader() {
  return (
    <div>
      <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-white">
        <Brain className="h-7 w-7 text-[#00FFC6]" />
        Track Decision Center
      </h1>
      <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[#B3B3B3]">
        This is the central artist view for track decisions. The page now shows the current decision output, explanation layer, evidence, rule profile, decision trace, and AI review input for the selected track.
      </p>
    </div>
  );
}
