import { NextResponse } from "next/server"
import { buildConsultantPrompt } from "@/lib/ai/consultant/buildConsultantPrompt"
import { isAiConsultantLive } from "@/lib/ai/consultant/config"
import { mockConsultantResponse } from "@/lib/ai/consultant/mockConsultantResponse"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import crypto from "crypto"

function parseConsultantExplanation(explanation: string) {
  const normalized = explanation.replace(/\r\n/g, "\n").trim()

  const extractSection = (label: "Headline" | "Body" | "Focus" | "Caution") => {
    const pattern = new RegExp(
      `${label}:\\s*([\\s\\S]*?)(?=\\n(?:Headline|Body|Focus|Caution):|$)`,
      "i"
    )

    const match = normalized.match(pattern)
    const value = match?.[1]?.trim()

    return value && value.length > 0 ? value : null
  }

  return {
    explanation: normalized,
    explanation_raw: normalized,
    headline: extractSection("Headline"),
    body: extractSection("Body"),
    focus: extractSection("Focus"),
    caution: extractSection("Caution"),
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { metrics, context, consultant_payload } = body

    if (!metrics) {
      return NextResponse.json(
        { error: "Missing metrics" },
        { status: 400 }
      )
    }

    const rawGoal = context?.goal

    const goal =
      rawGoal === "club" || rawGoal === "streaming" || rawGoal === "balanced"
        ? rawGoal
        : "balanced"

    const genreFromConsultantPayload =
      typeof consultant_payload?.genre_context?.declared_subgenre === "string" &&
      consultant_payload.genre_context.declared_subgenre.trim().length > 0
        ? consultant_payload.genre_context.declared_subgenre.trim()
        : typeof consultant_payload?.genre_context?.declared_main_genre === "string" &&
            consultant_payload.genre_context.declared_main_genre.trim().length > 0
          ? consultant_payload.genre_context.declared_main_genre.trim()
          : null

    const genre =
      genreFromConsultantPayload ??
      (typeof context?.genre === "string" && context.genre.trim().length > 0
        ? context.genre.trim()
        : null)

    // build token-sparenden prompt (für später live)
    const { system, user } = buildConsultantPrompt({
      goal,
      genre,
      metrics,
      consultant_payload,
    })

    const cacheKey = crypto
      .createHash("sha256")
      .update(JSON.stringify({ goal, genre, metrics, consultant_payload }))
      .digest("hex")

    if (!isAiConsultantLive()) {
      const result = mockConsultantResponse(metrics, consultant_payload ?? null)
      const explanation = result.explanation ?? String(result)

      return NextResponse.json(parseConsultantExplanation(explanation))
    }

    const supabase = await createSupabaseServerClient()

    const { data: cached } = await supabase
      .from("ai_consultant_cache")
      .select("explanation")
      .eq("cache_key", cacheKey)
      .maybeSingle()

    if (cached?.explanation) {
      return NextResponse.json({
        ...parseConsultantExplanation(cached.explanation),
        cached: true,
      })
    }

    // system/user prompt already built via buildConsultantPrompt({ goal, genre, metrics })
    // Launch TODO: send { system, user } to OpenAI and return explanation.
    void system
    void user

    const explanation =
      "AI live mode not implemented yet. Prompt builder is ready for launch."

    // best-effort cache write (ignore errors)
    await supabase.from("ai_consultant_cache").upsert(
      {
        cache_key: cacheKey,
        goal: String(goal),
        genre: genre ? String(genre) : null,
        explanation,
      },
      { onConflict: "cache_key" }
    )

    return NextResponse.json(
      {
        ...parseConsultantExplanation(explanation),
        cached: false,
      },
      { status: 501 }
    )

  } catch (error) {
    console.error("Consultant API error", error)

    return NextResponse.json(
      { error: "Consultant request failed" },
      { status: 500 }
    )
  }
}