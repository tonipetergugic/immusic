"use client";

import type { ArtistPageDto } from "./_types/artistPageDto";

import ArtistHeader from "./_components/ArtistHeader";
import ArtistTopTracksSection from "./_components/ArtistTopTracksSection";
import ArtistReleasesSection from "./_components/ArtistReleasesSection";
import ArtistPlaylistsSection from "./_components/ArtistPlaylistsSection";

export default function ArtistClient({
  dto,
  shareUrl,
}: {
  dto: ArtistPageDto;
  shareUrl: string;
}) {
  return (
    <div className="px-6 pb-6 pt-0">
      <ArtistHeader
        artist={dto.artist}
        viewer={dto.viewer}
        counts={dto.counts}
        initialStates={dto.initialStates}
        shareUrl={shareUrl}
      />

      <ArtistReleasesSection
        releases={dto.releases}
        artistId={dto.artist.id}
        artistName={dto.artist.displayName}
      />

      <ArtistPlaylistsSection playlists={dto.playlists} />

      <ArtistTopTracksSection
        topTracks={dto.topTracks}
        fallbackArtistId={dto.artist.id}
        fallbackDisplayName={dto.artist.displayName}
      />
    </div>
  );
}
