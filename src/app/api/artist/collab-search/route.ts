import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ results: [] }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Only artists can search collaborators
  if (profile?.role !== "artist") {
    return NextResponse.json({ results: [] }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,display_name")
    .ilike("display_name", `%${q}%`)
    .limit(8);

  if (error) {
    return NextResponse.json({ results: [] }, { status: 500 });
  }

  // Never return yourself
  const results = (data ?? []).filter((p) => p.id !== user.id);

  return NextResponse.json({ results });
}

