import { NextResponse } from "next/server"
import { buildConsultantPrompt } from "@/lib/ai/consultant/buildConsultantPrompt"
import { isAiConsultantLive } from "@/lib/ai/consultant/config"
import { mockConsultantResponse } from "@/lib/ai/consultant/mockConsultantResponse"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
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

function extractOpenAiExplanation(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null

  const output = (payload as { output?: unknown }).output
  if (!Array.isArray(output)) return null

  const parts: string[] = []

  for (const item of output) {
    if (!item || typeof item !== "object") continue

    const typedItem = item as {
      type?: unknown
      content?: unknown
    }

    if (typedItem.type !== "message" || !Array.isArray(typedItem.content)) continue

    for (const contentItem of typedItem.content) {
      if (!contentItem || typeof contentItem !== "object") continue

      const typedContentItem = contentItem as {
        type?: unknown
        text?: unknown
      }

      if (
        typedContentItem.type === "output_text" &&
        typeof typedContentItem.text === "string" &&
        typedContentItem.text.trim().length > 0
      ) {
        parts.push(typedContentItem.text.trim())
      }
    }
  }

  if (parts.length === 0) return null
  return parts.join("\n\n").trim()
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

    const supabase = getSupabaseAdmin()
    const cacheTable = supabase.from("ai_consultant_cache") as any

    const { data: cachedRaw, error: cacheReadError } = await cacheTable
      .select("explanation")
      .eq("cache_key", cacheKey)
      .maybeSingle()

    if (cacheReadError) {
      console.error("Consultant cache read failed", cacheReadError)

      return NextResponse.json(
        { error: "Consultant cache read failed" },
        { status: 502 }
      )
    }

    const cachedExplanation =
      (cachedRaw as { explanation?: string | null } | null)?.explanation ?? null

    if (cachedExplanation) {
      return NextResponse.json({
        ...parseConsultantExplanation(cachedExplanation),
        cached: true,
      })
    }

    const openAiApiKey = process.env.OPENAI_API_KEY
    const openAiModel = process.env.OPENAI_CONSULTANT_MODEL

    if (!openAiApiKey || openAiApiKey.trim().length === 0) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      )
    }

    if (!openAiModel || openAiModel.trim().length === 0) {
      return NextResponse.json(
        { error: "Missing OPENAI_CONSULTANT_MODEL" },
        { status: 500 }
      )
    }

    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiApiKey}`,
      },
      body: JSON.stringify({
        model: openAiModel.trim(),
        instructions: system,
        input: user,
        store: false,
        temperature: 0.3,
        max_output_tokens: 700,
      }),
    })

    const openAiPayload = await openAiResponse.json().catch(() => null)

    if (!openAiResponse.ok) {
      console.error("Consultant OpenAI API error", {
        status: openAiResponse.status,
        payload: openAiPayload,
      })

      return NextResponse.json(
        { error: "OpenAI consultant request failed" },
        { status: 502 }
      )
    }

    const explanation = extractOpenAiExplanation(openAiPayload)

    if (!explanation) {
      console.error("Consultant OpenAI API returned no explanation text", openAiPayload)

      return NextResponse.json(
        { error: "OpenAI consultant returned no explanation text" },
        { status: 502 }
      )
    }

    const { error: cacheUpsertError } = await cacheTable.upsert(
      {
        cache_key: cacheKey,
        goal: String(goal),
        genre: genre ? String(genre) : null,
        explanation,
      },
      { onConflict: "cache_key" }
    )

    if (cacheUpsertError) {
      console.error("Consultant cache upsert failed", cacheUpsertError)

      return NextResponse.json(
        { error: "Consultant cache write failed" },
        { status: 502 }
      )
    }

    return NextResponse.json({
      ...parseConsultantExplanation(explanation),
      cached: false,
    })

  } catch (error) {
    console.error("Consultant API error", error)

    return NextResponse.json(
      { error: "Consultant request failed" },
      { status: 500 }
    )
  }
}