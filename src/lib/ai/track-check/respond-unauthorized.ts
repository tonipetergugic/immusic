import { NextResponse } from "next/server";

export function respondUnauthorized(): NextResponse {
  return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}
