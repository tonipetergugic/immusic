import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { buildPlaylistCoverUrlServer } from "@/lib/playlistCovers.server";
import PublicProfileView from "./_components/PublicProfileView";
import type { PublicProfile, PublicPlaylist } from "./_types/public-profile";

type PublicPlaylistRow = PublicPlaylist & {
  cover_path: string | null;
  cover_preview_path: string | null;
};

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
    .select("id, display_name, avatar_url, avatar_path, role, updated_at")
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

  const resolvedProfile: PublicProfile = {
    ...profile,
    avatar_url: profile.avatar_path
      ? supabase.storage.from("avatars").getPublicUrl(profile.avatar_path).data.publicUrl ??
        profile.avatar_url ??
        null
      : profile.avatar_url ?? null,
  };

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
      .select("id, title, description, cover_url, cover_path, cover_preview_path, is_public, created_at")
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
      playlists = ((playlistRows ?? []) as PublicPlaylistRow[]).map((pl) => ({
        ...pl,
        cover_url: buildPlaylistCoverUrlServer({
          supabase,
          cover_preview_path: pl.cover_preview_path ?? null,
          cover_path: pl.cover_path ?? null,
          cover_url: pl.cover_url ?? null,
        }),
      }));
    }
  } catch (error) {
    console.error("Failed to load public profile playlists:", error);
    playlists = [];
  }

  return (
    <PublicProfileView
      profile={resolvedProfile}
      playlists={playlists}
      profileId={profileId}
      canFollow={canFollow}
      followerCount={followerCount ?? 0}
      followingCount={followingCount ?? 0}
      isFollowingInitial={isFollowingInitial}
    />
  );
}
