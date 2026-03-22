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
    <div className="space-y-5 rounded-[28px] border border-white/10 bg-black/30 p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-4">
          <div className="space-y-2.5">
            <div className="text-[28px] font-semibold tracking-tight text-white">
              AI Mastering Consultant
            </div>
            <p className="max-w-3xl text-base leading-relaxed text-white/68">
              Choose your genre and target, then click <span className="font-medium text-white">“Explain this mix”</span> to get a clear technical interpretation of your current metrics.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
                <div className="space-y-2">
                  <div className="text-base font-semibold text-white/85">Genre</div>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="h-13 min-w-[280px] cursor-pointer rounded-2xl border border-white/15 bg-black/50 px-4 text-base text-white outline-none transition focus:border-[#00FFC6]/50"
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

                <div className="space-y-2">
                  <div className="text-base font-semibold text-white/85">Target</div>
                  <select
                    value={goal}
                    onChange={(e) => setGoal(e.target.value as any)}
                    className="h-13 min-w-[200px] cursor-pointer rounded-2xl border border-white/15 bg-black/50 px-4 text-base text-white outline-none transition focus:border-[#00FFC6]/50"
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
                className="inline-flex h-13 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-[#00FFC6]/60 bg-transparent px-6 text-base font-semibold text-[#00FFC6] transition hover:-translate-y-[1px] hover:border-[#00FFC6] hover:bg-[#00FFC6]/10 hover:shadow-[0_10px_30px_rgba(0,255,198,0.15)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-black border-t-transparent animate-spin"></span>
                    Analyzing...
                  </span>
                ) : (
                  "Explain this mix"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {errorMsg ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {errorMsg}
        </div>
      ) : null}

      {explanation ? (
        <div className="rounded-[24px] border border-white/10 bg-black/40 p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-[#00FFC6]" />
            <div className="text-sm font-semibold tracking-wide text-white/85">
              AI Interpretation
            </div>
          </div>

          <div className="space-y-3 text-[15px] leading-7 text-white/82">
            {explanation.split("\n").map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-4 text-sm leading-relaxed text-white/45">
          Your AI interpretation will appear here after you click <span className="font-medium text-white/70">“Explain this mix”</span>.
        </div>
      )}
    </div>
  )
}
