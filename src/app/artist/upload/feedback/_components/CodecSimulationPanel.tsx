"use client";

function n(x: any): number | null {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

function i(x: any): number | null {
  return typeof x === "number" && Number.isFinite(x) ? Math.trunc(x) : null;
}

function risk(x: any): "low" | "moderate" | "high" | null {
  const s = typeof x === "string" ? x : "";
  return s === "low" || s === "moderate" || s === "high" ? s : null;
}

function Badge(props: { r: "low" | "moderate" | "high" | null }) {
  const r = props.r;
  if (!r) return <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/60">—</span>;

  if (r === "high") {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full border border-red-400/30 bg-red-500/10 text-red-200">
        HIGH
      </span>
    );
  }

  if (r === "moderate") {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full border border-yellow-400/30 bg-yellow-500/10 text-yellow-200">
        MODERATE
      </span>
    );
  }

  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/60">
      LOW
    </span>
  );
}

function Row(props: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-black/20 p-2 border border-white/5">
      <span className="text-[11px] text-white/60">{props.label}</span>
      <span className="text-[11px] text-white/50 tabular-nums">{props.value}</span>
    </div>
  );
}

export default function CodecSimulationPanel(props: { payload: any }) {
  const cs = (props.payload as any)?.codec_simulation ?? null;
  if (!cs) return null;

  const preTp = n(cs.pre_true_peak_db);

  const aac = cs.aac128 ?? null;
  const mp3 = cs.mp3128 ?? null;

  if (!aac || !mp3) return null;

  const aacPost = n(aac.post_true_peak_db);
  const aacOvers = i(aac.overs_count);
  const aacDelta = n(aac.headroom_delta_db);
  const aacRisk = risk(aac.distortion_risk);

  const mp3Post = n(mp3.post_true_peak_db);
  const mp3Overs = i(mp3.overs_count);
  const mp3Delta = n(mp3.headroom_delta_db);
  const mp3Risk = risk(mp3.distortion_risk);

  const worstPostTp =
    aacPost !== null && mp3Post !== null
      ? Math.max(aacPost, mp3Post)
      : aacPost !== null
        ? aacPost
        : mp3Post !== null
          ? mp3Post
          : null;

  const worstPostHeadroom = worstPostTp === null ? null : 0.0 - worstPostTp;

  return (
    <div className="rounded-lg bg-black/20 p-3 border border-white/5 md:col-span-2 xl:col-span-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-white/70">Streaming Safety (Codec Simulation)</div>
          <div className="text-[11px] text-white/50 mt-1">
            Lossy encode→decode check (AAC 128 / MP3 128). Purely technical: post-encode True Peak, overs, and worst-case post-encode headroom.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/40">Risk</span>
          {/* show worst of both */}
          <Badge
            r={
              aacRisk === "high" || mp3Risk === "high"
                ? "high"
                : aacRisk === "moderate" || mp3Risk === "moderate"
                  ? "moderate"
                  : aacRisk === "low" || mp3Risk === "low"
                    ? "low"
                    : null
            }
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2">
        <Row
          label="Pre-encode True Peak"
          value={preTp === null ? "—" : `${preTp.toFixed(3)} dBTP`}
        />
        <Row
          label="Worst-case post-encode headroom"
          value={worstPostHeadroom === null ? "—" : `${worstPostHeadroom.toFixed(3)} dBTP`}
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
        <div className="rounded-lg bg-black/20 p-3 border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/70">AAC 128</span>
            <Badge r={aacRisk} />
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2">
            <Row
              label="Post-encode True Peak"
              value={aacPost === null ? "—" : `${aacPost.toFixed(3)} dBTP`}
            />
            <Row
              label="Overs (events)"
              value={aacOvers === null ? "—" : String(aacOvers)}
            />
            <Row
              label="Headroom delta"
              value={aacDelta === null ? "—" : `${aacDelta.toFixed(3)} dB`}
            />
          </div>
        </div>

        <div className="rounded-lg bg-black/20 p-3 border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/70">MP3 128</span>
            <Badge r={mp3Risk} />
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2">
            <Row
              label="Post-encode True Peak"
              value={mp3Post === null ? "—" : `${mp3Post.toFixed(3)} dBTP`}
            />
            <Row
              label="Overs (events)"
              value={mp3Overs === null ? "—" : String(mp3Overs)}
            />
            <Row
              label="Headroom delta"
              value={mp3Delta === null ? "—" : `${mp3Delta.toFixed(3)} dB`}
            />
          </div>
        </div>
      </div>

      <div className="mt-3 text-[11px] text-white/50">
        Tip: If post-encode True Peak approaches or exceeds 0.0 dBTP, reduce limiter ceiling (e.g. -1.0 dBTP) to increase encoding headroom.
      </div>
    </div>
  );
}
