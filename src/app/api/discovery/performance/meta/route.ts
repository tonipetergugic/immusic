import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Body = {
  trackIds?: string[];
  includeListenState?: boolean;
};

type MyRatingRow = {
  track_id: string;
  stars: number | null;
};

type ListenStateRow = {
  track_id: string;
  listened_seconds: number | null;
  can_rate: boolean | null;
};

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return NextResponse.json(
      {
        ok: true,
        myStarsByTrackId: {},
        listenStateByTrackId: {},
      },
      { status: 200 }
    );
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const trackIds = Array.from(
    new Set(
      Array.isArray(body.trackIds)
        ? body.trackIds.filter(
            (value): value is string => typeof value === "string" && value.trim().length > 0
          )
        : []
    )
  ).slice(0, 100);

  const includeListenState = body.includeListenState === true;

  if (trackIds.length === 0) {
    return NextResponse.json(
      {
        ok: true,
        myStarsByTrackId: {},
        listenStateByTrackId: {},
      },
      { status: 200 }
    );
  }

  const [{ data: myRatings, error: myRatingsErr }, { data: listenRows, error: listenErr }] =
    await Promise.all([
      supabase
        .from("track_ratings")
        .select("track_id, stars")
        .eq("user_id", user.id)
        .in("track_id", trackIds),
      includeListenState
        ? supabase
            .from("track_listen_state")
            .select("track_id, listened_seconds, can_rate")
            .eq("user_id", user.id)
            .in("track_id", trackIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (myRatingsErr) {
    return NextResponse.json(
      { ok: false, error: `track_ratings query failed: ${myRatingsErr.message}` },
      { status: 500 }
    );
  }

  if (listenErr) {
    return NextResponse.json(
      { ok: false, error: `track_listen_state query failed: ${listenErr.message}` },
      { status: 500 }
    );
  }

  const myStarsByTrackId: Record<string, number | null> = {};
  const listenStateByTrackId: Record<
    string,
    { can_rate: boolean | null; listened_seconds: number | null }
  > = {};

  for (const row of (myRatings ?? []) as MyRatingRow[]) {
    if (!row?.track_id) continue;
    myStarsByTrackId[String(row.track_id)] =
      typeof row.stars === "number" ? row.stars : null;
  }

  for (const row of (listenRows ?? []) as ListenStateRow[]) {
    if (!row?.track_id) continue;

    listenStateByTrackId[String(row.track_id)] = {
      can_rate: typeof row.can_rate === "boolean" ? row.can_rate : null,
      listened_seconds:
        typeof row.listened_seconds === "number" ? row.listened_seconds : 0,
    };
  }

  return NextResponse.json(
    {
      ok: true,
      myStarsByTrackId,
      listenStateByTrackId,
    },
    { status: 200 }
  );
}
