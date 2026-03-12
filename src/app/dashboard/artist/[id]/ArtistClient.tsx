"use client";

import type { ArtistPageDto } from "./_types/artistPageDto";

import ArtistHeader from "./_components/ArtistHeader";
import ArtistTopTracksSection from "./_components/ArtistTopTracksSection";
import ArtistReleasesSection from "./_components/ArtistReleasesSection";
import ArtistPlaylistsSection from "./_components/ArtistPlaylistsSection";
import ArtistAllTracksSection from "./_components/ArtistAllTracksSection";

export default function ArtistClient({
  dto,
  shareUrl,
}: {
  dto: ArtistPageDto;
  shareUrl: string;
}) {
  return (
    <div className="w-full pb-6 pt-0">
      <ArtistHeader
        artist={dto.artist}
        viewer={dto.viewer}
        counts={dto.counts}
        initialStates={dto.initialStates}
        shareUrl={shareUrl}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-10">
        <div className="lg:col-span-2">
          <ArtistTopTracksSection
            topTracks={dto.topTracks}
            fallbackArtistId={dto.artist.id}
            fallbackDisplayName={dto.artist.displayName}
          />
        </div>

        <div className="mt-3 lg:pl-6">
          {dto.artist.bio ? (
            <div>
              <h3 className="text-3xl font-bold text-white">
                Ab<span className="text-[#00FFC6]">out</span>
              </h3>
              <p className="mt-4 whitespace-pre-line text-base leading-8 text-white/90">
                {dto.artist.bio}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <ArtistReleasesSection
        releases={dto.releases}
        artistId={dto.artist.id}
        artistName={dto.artist.displayName}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-0">
        {dto.allTracks.length > 0 ? (
          <>
            <div className="lg:col-span-2">
              <ArtistAllTracksSection
                allTracks={dto.allTracks}
                fallbackArtistId={dto.artist.id}
                fallbackDisplayName={dto.artist.displayName}
              />
            </div>

            <div className="mt-6 lg:pl-6">
              <ArtistPlaylistsSection playlists={dto.playlists} />
            </div>
          </>
        ) : (
          <div> 
            <ArtistPlaylistsSection playlists={dto.playlists} />
          </div>
        )}
      </div>
    </div>
  );
}
