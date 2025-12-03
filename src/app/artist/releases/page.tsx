"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ReleaseRecord = {
  id: string;
  title: string;
  release_type: string;
  cover_path: string | null;
  created_at: string;
  cover_url?: string | null;
};

export default function ReleasesPage() {
  const [releases, setReleases] = useState<ReleaseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    let isMounted = true;

    async function loadReleases() {
      setLoading(true);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user?.id) {
          if (isMounted) {
            setReleases([]);
          }
          return;
        }

        const { data, error } = await supabase
          .from("releases")
          .select("id, title, release_type, cover_path, created_at")
          .eq("artist_id", user.id)
          .order("created_at", { ascending: false });

        if (!isMounted) {
          return;
        }

        if (!error && data) {
          const withCoverUrls = data.map((release) => ({
            ...release,
            cover_url: release.cover_path
              ? supabase.storage
                  .from("release_covers")
                  .getPublicUrl(release.cover_path).data.publicUrl
              : null,
          }));
          setReleases(withCoverUrls);
        } else {
          setReleases([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadReleases();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen p-10 bg-[#0E0E10] text-white">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">My Releases</h1>
        <Link
          href="/artist/releases/create"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-[#00FFC6] text-black font-semibold hover:bg-[#00E0B0]"
        >
          Create Release
        </Link>
      </div>

      <div className="mt-8">
        {loading ? (
          <p className="text-sm text-gray-400">Loading releases...</p>
        ) : releases.length === 0 ? (
          <p className="text-sm text-gray-400">No releases yet</p>
        ) : (
          <ul className="space-y-4">
            {releases.map((release) => {
              return (
                <li
                  key={release.id}
                  className="rounded-lg border border-[#27272A] bg-[#18181B] p-4 hover:bg-[#1F1F23] transition"
                >
                  <Link href={`/artist/releases/${release.id}`} className="flex items-center gap-4">
                    {release.cover_url ? (
                      <img
                        src={release.cover_url}
                        alt={`${release.title} cover`}
                        className="h-16 w-16 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded bg-[#1F1F23] text-xs text-gray-500">
                        No Cover
                      </div>
                    )}

                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-wide text-gray-400">
                        {release.release_type}
                      </p>
                      <p className="text-lg font-semibold">{release.title}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(release.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

