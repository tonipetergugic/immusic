import { NextResponse } from "next/server"
import { isAiConsultantLive } from "@/lib/ai/consultant/config"
import { mockConsultantResponse } from "@/lib/ai/consultant/mockConsultantResponse"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { metrics } = body

    if (!metrics) {
      return NextResponse.json(
        { error: "Missing metrics" },
        { status: 400 }
      )
    }

    if (!isAiConsultantLive()) {
      const result = mockConsultantResponse(metrics)
      return NextResponse.json(result)
    }

    return NextResponse.json({
      explanation: "AI live mode not implemented yet"
    })

  } catch (error) {
    console.error("Consultant API error", error)

    return NextResponse.json(
      { error: "Consultant request failed" },
      { status: 500 }
    )
  }
}