"use client"

import { useEffect, useMemo, useState } from "react"
import { mapConsultantMetrics } from "@/lib/ai/consultant/mapConsultantMetrics"
import AppSelect from "@/components/AppSelect"

const CONSULTANT_GENRE_ITEMS = [
  {
    label: "Trance",
    options: [
      { value: "Trance", label: "Trance" },
      { value: "Progressive Trance", label: "Progressive Trance" },
      { value: "Uplifting Trance", label: "Uplifting Trance" },
      { value: "Psytrance", label: "Psytrance" },
      { value: "Hard Trance", label: "Hard Trance" },
    ],
  },
  {
    label: "Techno",
    options: [
      { value: "Techno", label: "Techno" },
      { value: "Melodic Techno", label: "Melodic Techno" },
      { value: "Peak Time Techno", label: "Peak Time Techno" },
      { value: "Industrial Techno", label: "Industrial Techno" },
      { value: "Hard Techno", label: "Hard Techno" },
    ],
  },
  {
    label: "House / EDM",
    options: [
      { value: "House", label: "House" },
      { value: "Deep House", label: "Deep House" },
      { value: "Progressive House", label: "Progressive House" },
      { value: "Tech House", label: "Tech House" },
      { value: "Afro House", label: "Afro House" },
      { value: "Future House", label: "Future House" },
      { value: "EDM", label: "EDM" },
      { value: "Big Room", label: "Big Room" },
      { value: "Electro House", label: "Electro House" },
      { value: "Festival EDM", label: "Festival EDM" },
    ],
  },
  {
    label: "Bass Music",
    options: [
      { value: "Drum & Bass", label: "Drum & Bass" },
      { value: "Liquid Drum & Bass", label: "Liquid Drum & Bass" },
      { value: "Neurofunk", label: "Neurofunk" },
      { value: "Dubstep", label: "Dubstep" },
      { value: "Melodic Dubstep", label: "Melodic Dubstep" },
      { value: "Future Bass", label: "Future Bass" },
    ],
  },
  {
    label: "Hard Dance",
    options: [
      { value: "Hardstyle", label: "Hardstyle" },
      { value: "Rawstyle", label: "Rawstyle" },
      { value: "Hardcore", label: "Hardcore" },
      { value: "Uptempo Hardcore", label: "Uptempo Hardcore" },
    ],
  },
  {
    label: "Pop / Urban",
    options: [
      { value: "Pop", label: "Pop" },
      { value: "Dance Pop", label: "Dance Pop" },
      { value: "Indie Pop", label: "Indie Pop" },
      { value: "Hip-Hop", label: "Hip-Hop" },
      { value: "Trap", label: "Trap" },
      { value: "Drill", label: "Drill" },
      { value: "R&B", label: "R&B" },
      { value: "Soul", label: "Soul" },
    ],
  },
  {
    label: "Rock / Metal",
    options: [
      { value: "Rock", label: "Rock" },
      { value: "Alternative Rock", label: "Alternative Rock" },
      { value: "Indie Rock", label: "Indie Rock" },
      { value: "Metal", label: "Metal" },
    ],
  },
  {
    label: "Other",
    options: [
      { value: "Ambient", label: "Ambient" },
      { value: "Cinematic", label: "Cinematic" },
      { value: "LoFi", label: "LoFi" },
      { value: "Other", label: "Other" },
    ],
  },
]

const CONSULTANT_TARGET_ITEMS = [
  { value: "balanced", label: "Balanced" },
  { value: "club", label: "Club" },
  { value: "streaming", label: "Streaming" },
]

const CONSULTANT_LANGUAGE_ITEMS = [
  { value: "English", label: "English" },
  { value: "German", label: "Deutsch" },
  { value: "Spanish", label: "Español" },
  { value: "French", label: "Français" },
  { value: "Italian", label: "Italiano" },
  { value: "Portuguese", label: "Português" },
]

type ConsultantApiResponse = {
  explanation: string
  explanation_raw?: string | null
  headline?: string | null
  body?: string | null
  focus?: string | null
  caution?: string | null
}

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
  consultantPayload?: Record<string, unknown> | null
  title?: string
  description?: string
  buttonLabel?: string
  initialGenre?: string | null
  source?: string
  showGenreSelect?: boolean
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
  consultantPayload = null,
  title = "AI Mastering Consultant",
  description = "Choose your genre, target, and language, then click \"Explain this mix\" to get a clear technical interpretation of your current metrics.",
  buttonLabel = "Explain this mix",
  initialGenre = null,
  source = "feedback-page",
  showGenreSelect = true,
}: Props) {

  const [consultantResponse, setConsultantResponse] = useState<ConsultantApiResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const additionalConsultantNotes = useMemo(() => {
    if (!consultantResponse) return []

    const raw = consultantResponse.explanation_raw ?? consultantResponse.explanation ?? ""
    if (typeof raw !== "string" || raw.trim().length === 0) return []

    const withoutStructuredSections = raw
      .replace(/Headline:\s*[\s\S]*?(?=\n(?:Headline|Body|Focus|Caution):|$)/i, "")
      .replace(/Body:\s*[\s\S]*?(?=\n(?:Headline|Body|Focus|Caution):|$)/i, "")
      .replace(/Focus:\s*[\s\S]*?(?=\n(?:Headline|Body|Focus|Caution):|$)/i, "")
      .replace(/Caution:\s*[\s\S]*?(?=\n(?:Headline|Body|Focus|Caution):|$)/i, "")
      .trim()

    if (withoutStructuredSections.length === 0) return []

    return withoutStructuredSections
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  }, [consultantResponse])

  const [loading, setLoading] = useState(false)
  const [genre, setGenre] = useState<string>("Trance")
  const [goal, setGoal] = useState<"balanced" | "club" | "streaming">("balanced")
  const [language, setLanguage] = useState<string>("English")
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const savedGenre = window.localStorage.getItem("ai_consultant_genre")
    const savedGoal = window.localStorage.getItem("ai_consultant_goal")
    const savedLanguage = window.localStorage.getItem("ai_consultant_language")

    const nextGenre =
      typeof initialGenre === "string" && initialGenre.trim().length > 0
        ? initialGenre.trim()
        : savedGenre && savedGenre.trim().length > 0
          ? savedGenre
          : "Trance"

    setGenre(nextGenre)

    if (savedGoal === "balanced" || savedGoal === "club" || savedGoal === "streaming") {
      setGoal(savedGoal)
    }

    const allowedLanguages = new Set(
      CONSULTANT_LANGUAGE_ITEMS.map((item) => item.value)
    )

    if (savedLanguage && allowedLanguages.has(savedLanguage)) {
      setLanguage(savedLanguage)
    } else {
      setLanguage("English")
    }

    setHydrated(true)
  }, [initialGenre])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem("ai_consultant_genre", genre)
  }, [genre, hydrated])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem("ai_consultant_goal", goal)
  }, [goal, hydrated])

  useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem("ai_consultant_language", language)
  }, [language, hydrated])

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
        consultant_payload: consultantPayload ?? null,
        context: {
          goal,
          genre,
          language,
          source,
        }
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setErrorMsg(data?.error ?? "Request failed")
      setLoading(false)
      return
    }

    setConsultantResponse({
      explanation: typeof data?.explanation === "string" ? data.explanation : "",
      explanation_raw: typeof data?.explanation_raw === "string" ? data.explanation_raw : null,
      headline: typeof data?.headline === "string" ? data.headline : null,
      body: typeof data?.body === "string" ? data.body : null,
      focus: typeof data?.focus === "string" ? data.focus : null,
      caution: typeof data?.caution === "string" ? data.caution : null,
    })

    setLoading(false)
  }

  return (
    <div className="space-y-5 rounded-[28px] border border-white/10 bg-black/30 p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-4">
          <div className="space-y-2.5">
            <div className="text-[28px] font-semibold tracking-tight text-white">
              {title}
            </div>
            <p className="max-w-3xl text-base leading-relaxed text-white/68">
              {description}
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
                {showGenreSelect ? (
                  <div className="space-y-2">
                    <div className="text-base font-semibold text-white/85">Genre</div>
                    <div className="min-w-[280px]">
                      <AppSelect
                        value={genre}
                        onChange={setGenre}
                        items={CONSULTANT_GENRE_ITEMS}
                        className="[&>button]:h-13 [&>button]:min-w-[280px] [&>button]:rounded-2xl [&>button]:border-white/15 [&>button]:bg-black/50 [&>button]:px-4 [&>button]:text-base [&>button]:text-white [&>button]:focus:border-[#00FFC6]/50 [&>button]:focus:ring-2 [&>button]:focus:ring-[#00FFC6]/20 [&>button_svg]:text-white/55"
                      />
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <div className="text-base font-semibold text-white/85">Target</div>
                  <div className="min-w-[200px]">
                    <AppSelect
                      value={goal}
                      onChange={(value) => setGoal(value as any)}
                      items={CONSULTANT_TARGET_ITEMS}
                      className="[&>button]:h-13 [&>button]:min-w-[200px] [&>button]:rounded-2xl [&>button]:border-white/15 [&>button]:bg-black/50 [&>button]:px-4 [&>button]:text-base [&>button]:text-white [&>button]:focus:border-[#00FFC6]/50 [&>button]:focus:ring-2 [&>button]:focus:ring-[#00FFC6]/20 [&>button_svg]:text-white/55"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-base font-semibold text-white/85">Language</div>
                  <div className="min-w-[200px]">
                    <AppSelect
                      value={language}
                      onChange={setLanguage}
                      items={CONSULTANT_LANGUAGE_ITEMS}
                      className="[&>button]:h-13 [&>button]:min-w-[200px] [&>button]:rounded-2xl [&>button]:border-white/15 [&>button]:bg-black/50 [&>button]:px-4 [&>button]:text-base [&>button]:text-white [&>button]:focus:border-[#00FFC6]/50 [&>button]:focus:ring-2 [&>button]:focus:ring-[#00FFC6]/20 [&>button_svg]:text-white/55"
                    />
                  </div>
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
                  buttonLabel
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

      {consultantResponse ? (
        <div className="rounded-[24px] border border-white/10 bg-black/40 p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-[#00FFC6]" />
            <div className="text-sm font-semibold tracking-wide text-white/85">
              AI Interpretation
            </div>
          </div>

          {consultantResponse.headline || consultantResponse.body || consultantResponse.focus || consultantResponse.caution ? (
            <div className="space-y-5">
              {consultantResponse.headline ? (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                    Headline
                  </div>
                  <p className="text-lg font-semibold leading-7 text-white">
                    {consultantResponse.headline}
                  </p>
                </div>
              ) : null}

              {consultantResponse.body ? (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                    Body
                  </div>
                  <p className="text-[15px] leading-7 text-white/82">
                    {consultantResponse.body}
                  </p>
                </div>
              ) : null}

              {consultantResponse.focus ? (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                    Focus
                  </div>
                  <p className="text-[15px] leading-7 text-white/82">
                    {consultantResponse.focus}
                  </p>
                </div>
              ) : null}

              {consultantResponse.caution ? (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                    Caution
                  </div>
                  <p className="text-[15px] leading-7 text-white/82">
                    {consultantResponse.caution}
                  </p>
                </div>
              ) : null}

              {additionalConsultantNotes.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
                    Additional notes
                  </div>
                  <div className="space-y-3 text-[15px] leading-7 text-white/75">
                    {additionalConsultantNotes.map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3 text-[15px] leading-7 text-white/82">
              {consultantResponse.explanation
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.length > 0)
                .map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-4 text-sm leading-relaxed text-white/45">
          Your AI interpretation will appear here after you click <span className="font-medium text-white/70">“Explain this mix”</span>.
        </div>
      )}
    </div>
  )
}
