import { Brain } from "lucide-react";

export function DecisionCenterHeader() {
  return (
    <div>
      <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-white">
        <Brain className="h-7 w-7 text-[#00FFC6]" />
        Track Decision Center
      </h1>
      <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[#B3B3B3]">
        Review the current track analysis in a clear, artist-focused way. Start with the main impression, then check the key structure signals and optional technical details.
      </p>
    </div>
  );
}
