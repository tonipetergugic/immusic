import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: profileId } = await params;

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const viewerId = user?.id ?? null;

  // 1) follower ids
  const { data: rows, error: fErr } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("following_id", profileId);

  if (fErr) {
    return NextResponse.json({ error: fErr.message }, { status: 500 });
  }

  const ids = (rows ?? []).map((r: any) => r.follower_id).filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json({ profiles: [], viewerId, viewerFollowingIds: [] });
  }

  // 2) profiles for those ids
  const { data: profs, error: pErr } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, role")
    .in("id", ids);

  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  // keep original order
  const map = new Map<string, any>(((profs as any) ?? []).map((p: any) => [p.id, p]));
  const profiles = ids.map((id: string) => map.get(id)).filter(Boolean);

  // 3) viewer following state for these ids (only if logged in)
  let viewerFollowingIds: string[] = [];
  if (viewerId) {
    const { data: edges, error: eErr } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", viewerId)
      .in("following_id", ids);

    if (eErr) {
      return NextResponse.json({ error: eErr.message }, { status: 500 });
    }

    viewerFollowingIds = (edges ?? []).map((e: any) => e.following_id).filter(Boolean);
  }

  return NextResponse.json({ profiles, viewerId, viewerFollowingIds });
}
