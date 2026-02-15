import { NextResponse } from "next/server";

export function respondQueueClaimFailed(): NextResponse {
  return NextResponse.json({ ok: false, error: "queue_claim_failed" }, { status: 500 });
}

export function respondAlreadyClaimed(): NextResponse {
  return NextResponse.json({ ok: true, processed: false, reason: "already_claimed" });
}
