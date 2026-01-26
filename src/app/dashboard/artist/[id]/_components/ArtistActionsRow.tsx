"use client";

import FollowArtistButton from "./_actions/FollowArtistButton";
import SaveArtistButton from "./_actions/SaveArtistButton";
import FollowCountsClient from "./_actions/FollowCountsClient";
import type { ViewerDto } from "../_types/artistPageDto";

export default function ArtistActionsRow({
  viewer,
  artistId,
  counts,
  initialStates,
}: {
  viewer: ViewerDto;
  artistId: string;
  counts: { followers: number; following: number };
  initialStates: { isFollowing: boolean; isSaved: boolean };
}) {
  return (
    <section className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <FollowCountsClient
          profileId={artistId}
          followerCount={counts.followers}
          followingCount={counts.following}
        />

        <div className="flex items-center gap-3">
          {/* Buttons bleiben wie alt – Viewer gating passiert bereits serverseitig über initialStates + UI */}
          {viewer.canSave ? (
            <SaveArtistButton
              artistId={artistId}
              viewerId={viewer.id}
              isSaved={initialStates.isSaved}
              onChange={() => {}}
            />
          ) : (
            <div className="opacity-50">
              <SaveArtistButton
                artistId={artistId}
                viewerId={viewer.id}
                isSaved={false}
                onChange={() => {}}
              />
            </div>
          )}

          {viewer.canFollow ? (
            <FollowArtistButton
              artistId={artistId}
              isFollowing={initialStates.isFollowing}
              onChange={() => {}}
            />
          ) : (
            <div className="opacity-50">
              <FollowArtistButton
                artistId={artistId}
                isFollowing={false}
                onChange={() => {}}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
