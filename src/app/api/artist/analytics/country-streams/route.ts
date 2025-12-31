import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AnalyticsRange = "7d" | "28d" | "all";

function normalizeRange(input: string | null): AnalyticsRange {
  if (input === "7d" || input === "28d" || input === "all") return input;
  return "28d";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const range = normalizeRange(url.searchParams.get("range"));

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json(
      { error: `Failed to load profile: ${profileError.message}` },
      { status: 500 }
    );
  }

  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 400 });
  }

  if (profile.role !== "artist" && profile.role !== "admin") {
    return NextResponse.json({ error: "Not an artist account." }, { status: 403 });
  }

  const artistId = profile.id;

  const { data, error } = await supabase
    .from("analytics_artist_country_streams_30d")
    .select("country_code, streams")
    .eq("artist_id", artistId)
    .order("streams", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: `Failed to fetch country streams: ${error.message}` },
      { status: 500 }
    );
  }

  const items = (data || []).map((r) => ({
    country_code: r.country_code,
    streams: Number(r.streams),
  }));

  const response = {
    range,
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    items,
  };

  return NextResponse.json({ data: response }, { status: 200 });
}

