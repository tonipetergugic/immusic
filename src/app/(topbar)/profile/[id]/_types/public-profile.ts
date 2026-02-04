export type PublicProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
  updated_at: string | null;
};

export type PublicPlaylist = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  is_public: boolean;
  created_at: string;
};
