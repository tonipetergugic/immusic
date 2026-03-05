"use client"

import { useEffect, useState } from "react"
import { mapConsultantMetrics } from "@/lib/ai/consultant/mapConsultantMetrics"

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [genre, setGenre] = useState<string>("Trance")
  const [goal, setGoal] = useState<"balanced" | "club" | "streaming">("balanced")
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const savedGenre = window.localStorage.getItem("ai_consultant_genre")
    const savedGoal = window.localStorage.getItem("ai_consultant_goal")

    if (savedGenre) setGenre(savedGenre)
    if (savedGoal === "balanced" || savedGoal === "club" || savedGoal === "streaming") {
      setGoal(savedGoal)
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem("ai_consultant_genre", genre)
  }, [genre, hydrated])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem("ai_consultant_goal", goal)
  }, [goal, hydrated])

  async function handleClick() {

    setErrorMsg(null)
    setLoading(true)

    const res = await fetch("/api/ai/consultant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        metrics: mapConsultantMetrics({
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
        }),
        context: {
          goal,
          genre,
          source: "feedback-page",
        }
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setErrorMsg(data?.error ?? "Request failed")
      setLoading(false)
      return
    }

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
          <div className="flex items-center gap-2">
            <div className="text-xs text-white/50">Genre</div>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="h-8 rounded-lg border border-white/10 bg-black/40 px-2 text-xs text-white/80"
            >
              <optgroup label="Trance">
                <option value="Trance">Trance</option>
                <option value="Progressive Trance">Progressive Trance</option>
                <option value="Uplifting Trance">Uplifting Trance</option>
                <option value="Psytrance">Psytrance</option>
                <option value="Hard Trance">Hard Trance</option>
              </optgroup>

              <optgroup label="Techno">
                <option value="Techno">Techno</option>
                <option value="Melodic Techno">Melodic Techno</option>
                <option value="Peak Time Techno">Peak Time Techno</option>
                <option value="Industrial Techno">Industrial Techno</option>
                <option value="Hard Techno">Hard Techno</option>
              </optgroup>

              <optgroup label="House / EDM">
                <option value="House">House</option>
                <option value="Deep House">Deep House</option>
                <option value="Progressive House">Progressive House</option>
                <option value="Tech House">Tech House</option>
                <option value="Afro House">Afro House</option>
                <option value="Future House">Future House</option>
                <option value="EDM">EDM</option>
                <option value="Big Room">Big Room</option>
                <option value="Electro House">Electro House</option>
                <option value="Festival EDM">Festival EDM</option>
              </optgroup>

              <optgroup label="Bass Music">
                <option value="Drum & Bass">Drum & Bass</option>
                <option value="Liquid Drum & Bass">Liquid Drum & Bass</option>
                <option value="Neurofunk">Neurofunk</option>
                <option value="Dubstep">Dubstep</option>
                <option value="Melodic Dubstep">Melodic Dubstep</option>
                <option value="Future Bass">Future Bass</option>
              </optgroup>

              <optgroup label="Hard Dance">
                <option value="Hardstyle">Hardstyle</option>
                <option value="Rawstyle">Rawstyle</option>
                <option value="Hardcore">Hardcore</option>
                <option value="Uptempo Hardcore">Uptempo Hardcore</option>
              </optgroup>

              <optgroup label="Pop / Urban">
                <option value="Pop">Pop</option>
                <option value="Dance Pop">Dance Pop</option>
                <option value="Indie Pop">Indie Pop</option>
                <option value="Hip-Hop">Hip-Hop</option>
                <option value="Trap">Trap</option>
                <option value="Drill">Drill</option>
                <option value="R&B">R&B</option>
                <option value="Soul">Soul</option>
              </optgroup>

              <optgroup label="Rock / Metal">
                <option value="Rock">Rock</option>
                <option value="Alternative Rock">Alternative Rock</option>
                <option value="Indie Rock">Indie Rock</option>
                <option value="Metal">Metal</option>
              </optgroup>

              <optgroup label="Other">
                <option value="Ambient">Ambient</option>
                <option value="Cinematic">Cinematic</option>
                <option value="LoFi">LoFi</option>
                <option value="Other">Other</option>
              </optgroup>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-white/50">Target</div>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value as any)}
              className="h-8 rounded-lg border border-white/10 bg-black/40 px-2 text-xs text-white/80"
            >
              <option value="balanced">Balanced</option>
              <option value="club">Club</option>
              <option value="streaming">Streaming</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleClick}
          disabled={loading}
          className="shrink-0 px-3 py-2 rounded-lg bg-emerald-500 text-black text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full border-2 border-black border-t-transparent animate-spin"></span>
              Analyzing...
            </span>
          ) : (
            "Explain this mix"
          )}
        </button>
      </div>

      {errorMsg ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {errorMsg}
        </div>
      ) : null}

      {explanation ? (
        <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-white/80 leading-relaxed whitespace-pre-line">
          {explanation.split("\n").map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      ) : (
        <div className="text-sm text-white/40">
          Click “Explain this mix” to get a pro-style interpretation of the current metrics.
        </div>
      )}
    </div>
  )
}
