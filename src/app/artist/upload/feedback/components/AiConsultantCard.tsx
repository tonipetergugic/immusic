"use client"

import { useState } from "react"

type Props = {
  lufs: number | null
  tp: number | null
  lra: number | null
  phase: number | null
  crest: number | null
  lowMono: number | null

  width: number | null
  midRms: number | null
  sideRms: number | null

  attack: number | null
  density: number | null

  sub: number | null
  mid: number | null
  air: number | null
}

export default function AiConsultantCard({
  lufs,
  tp,
  lra,
  phase,
  crest,
  lowMono,
  width,
  midRms,
  sideRms,
  attack,
  density,
  sub,
  mid,
  air,
}: Props) {

  const [explanation, setExplanation] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleClick() {

    setLoading(true)

    const res = await fetch("/api/ai/consultant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        metrics: {
          LUFS: lufs,
          TP: tp,
          LRA: lra,
          PHASE: phase,
          CREST: crest,
          LOW_MONO: lowMono,

          WIDTH: width,
          MID_RMS: midRms,
          SIDE_RMS: sideRms,

          ATTACK: attack,
          DENSITY: density,

          SUB_RMS: sub,
          MID_RMS_SPEC: mid,
          AIR_RMS: air,
        },
        context: {
          goal: "balanced",
          source: "feedback-page"
        }
      }),
    })

    const data = await res.json()

    console.log("AI CONSULTANT RESPONSE:", data)

    setExplanation(data.explanation)

    setLoading(false)
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="text-sm font-semibold tracking-wide text-white/90">
            AI Mastering Consultant
          </div>
          <div className="text-xs text-white/50">
            Contextual interpretation of your metrics.
          </div>
        </div>

        <button
          onClick={handleClick}
          disabled={loading}
          className="shrink-0 px-3 py-2 rounded-lg bg-emerald-500 text-black text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Analyzing..." : "Explain this mix"}
        </button>
      </div>

      {explanation ? (
        <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-white/80 leading-relaxed">
          {explanation}
        </div>
      ) : (
        <div className="text-sm text-white/40">
          Click “Explain this mix” to get a pro-style interpretation of the current metrics.
        </div>
      )}
    </div>
  )
}
