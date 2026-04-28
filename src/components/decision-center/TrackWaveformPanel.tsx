type TrackWaveformPanelProps = {
  trackFolderName: string;
  trackTitle: string;
};

export function TrackWaveformPanel({
  trackFolderName,
  trackTitle,
}: TrackWaveformPanelProps) {
  const waveformSrc = `/decision-center-lab/assets?track=${encodeURIComponent(
    trackFolderName,
  )}&file=waveform.png`;

  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#00FFC6]/15 bg-[linear-gradient(135deg,rgba(0,255,198,0.055),rgba(255,255,255,0.025)_32%,rgba(255,255,255,0.012))] p-6 shadow-2xl shadow-black/20 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#00FFC6]/80">
            Waveform
          </p>

          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white md:text-3xl">
            Track timeline
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            A visual overview of the track arrangement, energy flow and main
            movement across the full recording.
          </p>
        </div>

        <div className="hidden rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-medium text-zinc-500 md:block">
          Visual overview
        </div>
      </div>

      <div className="mt-7 overflow-hidden rounded-3xl border border-white/10 bg-black/35 shadow-inner shadow-black/40">
        <div className="h-px bg-gradient-to-r from-transparent via-[#00FFC6]/55 to-transparent" />

        <div className="p-3 md:p-4">
          <img
            src={waveformSrc}
            alt={`Waveform for ${trackTitle}`}
            className="block h-auto w-full rounded-2xl opacity-95 saturate-150"
          />
        </div>
      </div>
    </section>
  );
}
