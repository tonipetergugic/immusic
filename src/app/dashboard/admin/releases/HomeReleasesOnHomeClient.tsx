"use client";

import HomeReleasesDndItem from "./HomeReleasesDndItem";
import HomeReleasesDndList from "./HomeReleasesDndList";
import CoverPlaceholder from "@/components/CoverPlaceholder";

type HomeItem = {
  id: string;
  item_id: string;
  position: number;
};

type ReleaseRow = {
  id: string;
  title: string | null;
  status: string | null;
  cover_path: string | null;
  profiles?: any;
  homeItemId: string;
  position: number;
};

export default function HomeReleasesOnHomeClient(props: {
  moduleId: string;
  homeReleases: ReleaseRow[];
  featuredIds: string[];
  getArtistName: (profiles: any) => string;
  getCoverSrc: (coverPath: string | null | undefined) => string | null;
  removeAction: (releaseId: string) => Promise<void>;
}) {
  const { moduleId, homeReleases, featuredIds, getArtistName, getCoverSrc, removeAction } = props;
  const featuredSet = new Set(featuredIds);

  if (homeReleases.length === 0) return null;

  return (
    <HomeReleasesDndList
      moduleId={moduleId}
      initialOrder={homeReleases.map((x) => x.homeItemId)}
    >
      {homeReleases.map((release) => {
        const artistName = getArtistName(release?.profiles);
        const coverSrc = getCoverSrc(release.cover_path);

        return (
          <HomeReleasesDndItem key={release.homeItemId} id={release.homeItemId}>
            <div className="flex items-center justify-between rounded-md bg-black/30 px-3 py-2">
              <div className="flex items-center gap-3 min-w-0">
                {coverSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverSrc}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-md object-cover border border-white/10"
                    loading="lazy"
                  />
                ) : (
                  <CoverPlaceholder size={56} />
                )}

                <div className="min-w-0">
                  <div className="text-sm text-white truncate">{release.title ?? "Untitled"}</div>
                  {artistName ? (
                    <div className="text-xs text-white/60 truncate">{artistName}</div>
                  ) : null}
                  <div className="text-xs text-[#B3B3B3]">{release.status ?? ""}</div>
                </div>
              </div>

              {featuredSet.has(release.id) ? (
                <button
                  type="button"
                  onClick={() => void removeAction(release.id)}
                  className="w-24 h-8 text-xs rounded-md flex items-center justify-center bg-red-500/10 text-red-300 hover:bg-red-500/20 transition"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </HomeReleasesDndItem>
        );
      })}
    </HomeReleasesDndList>
  );
}
