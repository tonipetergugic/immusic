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
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
          Waveform
        </p>
        <h2 className="mt-2 text-lg font-semibold text-white">
          Track timeline
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          A visual overview of the track arrangement and energy distribution.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
        <img
          src={waveformSrc}
          alt={`Waveform for ${trackTitle}`}
          className="block h-auto w-full"
        />
      </div>
    </section>
  );
}
