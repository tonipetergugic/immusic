import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getArtistAnalyticsSummary,
  type AnalyticsRange,
} from "@/lib/analytics/getArtistAnalytics.server";

export const dynamic = "force-dynamic";

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

  // Resolve artist profile id (profiles.id) for the logged-in user.
  // In this project, tracks.artist_id references profiles.id (not auth.users.id).
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
    return NextResponse.json(
      { error: "Profile not found for current user." },
      { status: 400 }
    );
  }

  if (profile.role !== "artist" && profile.role !== "admin") {
    return NextResponse.json(
      { error: "Not an artist account." },
      { status: 403 }
    );
  }

  const artistId = profile.id;

  try {
    const summary = await getArtistAnalyticsSummary({ artistId, range });
    return NextResponse.json({ summary }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

