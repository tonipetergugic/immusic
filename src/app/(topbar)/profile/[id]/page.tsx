import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import PublicProfileView from "./_components/PublicProfileView";
import type { PublicProfile, PublicPlaylist } from "./_types/public-profile";

export default async function PublicProfileV2Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: profileId } = await params;
  if (!profileId) notFound();

  const cookieStore = await cookies();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const origin = host ? `${proto}://${host}` : "";

  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  // 1) Profile (server-first)
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, role, updated_at")
    .eq("id", profileId)
    .maybeSingle<PublicProfile>();

  if (pErr) {
    // hard fail: this is audit-friendly (surfaced)
    throw pErr;
  }

  if (!profile) {
    // explicit not found
    notFound();
  }

  // viewer (server-first)
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();

  const viewerId = viewer?.id ?? null;
  const isSelf = !!viewerId && viewerId === profileId;
  const canFollow = !!viewerId && !isSelf;

  // counts + following state (server-first, minimal)
  const [
    { count: followerCount },
    { count: followingCount },
    { count: followingEdgeCount },
  ] = await Promise.all([
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", profileId),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", profileId),
    canFollow
      ? supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", viewerId as string)
          .eq("following_id", profileId)
      : Promise.resolve({ count: 0 } as any),
  ]);

  const isFollowingInitial = canFollow ? (followingEdgeCount ?? 0) > 0 : false;

  // 2) Playlists (server-first via existing endpoint, no schema guessing)
  const plRes = await fetch(`${origin}/api/profiles/${profileId}/playlists`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
  const plJson = await plRes.json().catch(() => ({}));
  const playlists: PublicPlaylist[] = plRes.ok ? (plJson?.playlists ?? []) : [];

  return (
    <PublicProfileView
      profile={profile}
      playlists={playlists}
      profileId={profileId}
      canFollow={canFollow}
      followerCount={followerCount ?? 0}
      followingCount={followingCount ?? 0}
      isFollowingInitial={isFollowingInitial}
    />
  );
}
