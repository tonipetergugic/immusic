import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const bucket = url.searchParams.get("bucket");
  const path = url.searchParams.get("path");

  if (!bucket || !path) {
    return NextResponse.json(
      { error: "Missing bucket or path" },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();

  const publicUrl =
    supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl ?? null;

  if (!publicUrl) {
    return NextResponse.json(
      { error: "Failed to build public url" },
      { status: 500 }
    );
  }

  return NextResponse.json({ publicUrl }, { status: 200 });
}

