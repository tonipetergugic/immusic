export type ArtistPageDto = {
  artist: ArtistCoreDto;

  viewer: ViewerDto;

  initialStates: {
    isFollowing: boolean;
    isSaved: boolean;
  };

  counts: {
    followers: number;
    following: number;
  };

  releases: ReleaseCardDto[];

  playlists: PlaylistCardDto[];

  topTracks: TopTrackDto[];
};

export type ArtistCoreDto = {
  id: string;
  displayName: string;
  bio: string | null;
  location: string | null;

  bannerUrl: string | null;
  avatarUrl: string | null;

  socials: {
    instagram: string | null;
    tiktok: string | null;
    facebook: string | null;
    x: string | null;
  };
};

export type ViewerDto = {
  id: string | null;

  canFollow: boolean;
  canSave: boolean;
  isSelf: boolean;
};

export type ReleaseCardDto = {
  id: string;
  title: string;
  coverUrl: string | null;
  releaseType: string | null;
  createdAt: string;
};

export type PlaylistCardDto = {
  id: string;
  title: string;
  coverUrl: string | null;
  createdAt: string;
};

export type TopTrackDto = {
  trackId: string;
  releaseId: string | null;

  title: string;
  coverUrl: string | null;

  artists: Array<{
    id: string;
    displayName: string;
  }>;

  audioUrl: string;

  stats30d: {
    streams: number;
    listeners: number;
    listenedSeconds: number;

    ratingsCount: number;
    ratingAvg: number | null;
  };
};
