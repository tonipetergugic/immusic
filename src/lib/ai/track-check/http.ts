import { NextResponse } from "next/server";
import type { TerminalDecision } from "@/lib/ai/track-check/types";

export function jsonTerminal<T extends TerminalDecision>(payload: T): NextResponse {
  return NextResponse.json(payload);
}
