import type { HomeReleaseCard } from "@/lib/supabase/getHomeReleases";
import type { HomePlaylistCard } from "@/lib/supabase/getHomePlaylists";

export type HomeModule = {
  id: string;
  title: string;
  module_type:
    | "release"
    | "playlist"
    | "mixed"
    | "performance_release"
    | "performance_playlist";
  position: number;
};

export type HomeItem = {
  id: string;
  module_id: string;
  item_type: "release" | "playlist";
  item_id: string;
  position: number;
};

export type DashboardHomeClientProps = {
  home: {
    modules: HomeModule[];
    itemsByModuleId: Record<string, HomeItem[]>;
  };
  releasesById: Record<string, HomeReleaseCard>;
  playlistsById: Record<string, HomePlaylistCard>;
  homeReleaseIds: string[];
  homePlaylistIds: string[];
  performanceReleaseIds: string[];
  performancePlaylistIds: string[];
};
