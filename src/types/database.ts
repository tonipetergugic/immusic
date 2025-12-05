// src/types/database.ts

export type Track = {
  id: string;
  title: string;
  artist_name: string | null;
  cover_url: string | null;
  audio_url: string;
  created_at: string | null;
  artist_id: string | null;
  bpm: number | null;
  key: string | null;
  artist?: {
    display_name: string | null;
  } | null;
  artist_profile?: {
    display_name: string | null;
  } | null;
  releases?: {
    status?: string | null;
    cover_path?: string | null;
  } | null;
};

export type Playlist = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  created_by: string | null;
  created_at: string;
  is_public: boolean;
};

export type PlaylistTrack = {
  position: number;
  tracks: Track;
};

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: "listener" | "artist" | "admin";
  created_at: string;
  updated_at: string;
  avatar_url: string | null;
};

export type Database = {
  public: {
    Tables: {
      tracks: {
        Row: Track;
      };
      playlists: {
        Row: Playlist;
      };
      playlist_tracks: {
        Row: PlaylistTrack;
      };
      profiles: {
        Row: Profile;
      };
    };
  };
};
