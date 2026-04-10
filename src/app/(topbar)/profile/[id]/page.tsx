import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import PublicProfileView from "./_components/PublicProfileView";
import type { PublicProfile, PublicPlaylist } from "./_types/public-profile";

function isHttpUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://");
}

export default async function PublicProfileV2Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: profileId } = await params;
  if (!profileId) notFound();

  const cookieStore = await cookies();

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
  const viewerFollowSourceId = viewerId && !isSelf ? viewerId : null;
  const canFollow = !!viewerFollowSourceId;

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
    viewerFollowSourceId
      ? supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", viewerFollowSourceId)
          .eq("following_id", profileId)
      : Promise.resolve({ count: 0 } as { count: number | null }),
  ]);

  const isFollowingInitial = canFollow ? (followingEdgeCount ?? 0) > 0 : false;

  // 2) Playlists (server-first, same logic as existing API route)
  let playlists: PublicPlaylist[] = [];

  try {
    let playlistsQuery = supabase
      .from("playlists")
      .select("id, title, description, cover_url, is_public, created_at")
      .eq("created_by", profileId)
      .order("created_at", { ascending: false });

    if (!isSelf) {
      playlistsQuery = playlistsQuery.eq("is_public", true);
    }

    const { data: playlistRows, error: playlistsError } = await playlistsQuery;

    if (playlistsError) {
      console.error("Failed to load public profile playlists:", playlistsError);
      playlists = [];
    } else {
      playlists = ((playlistRows ?? []) as PublicPlaylist[]).map((pl) => {
        const raw = pl.cover_url ?? null;

        if (raw && isHttpUrl(raw)) {
          return { ...pl, cover_url: raw };
        }

        if (raw) {
          const publicUrl =
            supabase.storage
              .from("playlist-covers")
              .getPublicUrl(raw).data.publicUrl ?? null;

          return { ...pl, cover_url: publicUrl };
        }

        return { ...pl, cover_url: null };
      });
    }
  } catch (error) {
    console.error("Failed to load public profile playlists:", error);
    playlists = [];
  }

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
