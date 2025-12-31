"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import FollowersModal from "@/components/FollowersModal";

export default function FollowCountsClient({
  profileId,
  followerCount,
  followingCount,
}: {
  profileId: string;
  followerCount: number;
  followingCount: number;
}) {
  const router = useRouter();

  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("Followers");
  const [modalProfiles, setModalProfiles] = useState<
    { id: string; display_name: string | null; avatar_url: string | null; role: string | null }[]
  >([]);
  const [modalLoading, setModalLoading] = useState(false);

  async function openFollowList(kind: "followers" | "following") {
    try {
      setModalLoading(true);
      setModalTitle(kind === "followers" ? "Followers" : "Following");
      setModalProfiles([]);
      setModalOpen(true);

      if (kind === "followers") {
        const { data: rows, error } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("following_id", profileId);

        if (error) throw error;

        const ids = (rows ?? []).map((r: any) => r.follower_id).filter(Boolean);
        if (ids.length === 0) {
          setModalProfiles([]);
          return;
        }

        const { data: profs, error: pErr } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, role")
          .in("id", ids);

        if (pErr) throw pErr;

        setModalProfiles((profs as any) ?? []);
      } else {
        const { data: rows, error } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", profileId);

        if (error) throw error;

        const ids = (rows ?? []).map((r: any) => r.following_id).filter(Boolean);
        if (ids.length === 0) {
          setModalProfiles([]);
          return;
        }

        const { data: profs, error: pErr } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, role")
          .in("id", ids);

        if (pErr) throw pErr;

        setModalProfiles((profs as any) ?? []);
      }
    } catch (err) {
      console.log("openFollowList error", err);
      setModalProfiles([]);
    } finally {
      setModalLoading(false);
    }
  }

  return (
    <>
      {/* Variante A: ohne Trenner */}
      <div className="mt-3 flex items-center gap-6 text-sm text-white/70">
        <button
          type="button"
          onClick={() => openFollowList("followers")}
          className="hover:text-white transition"
        >
          <span className="text-white/90 font-semibold tabular-nums">
            {followerCount}
          </span>{" "}
          Followers
        </button>

        <button
          type="button"
          onClick={() => openFollowList("following")}
          className="hover:text-white transition"
        >
          <span className="text-white/90 font-semibold tabular-nums">
            {followingCount}
          </span>{" "}
          Following
        </button>
      </div>

      <FollowersModal
        open={modalOpen}
        title={modalLoading ? `${modalTitle}…` : modalTitle}
        profiles={modalProfiles}
        onClose={() => setModalOpen(false)}
        onProfileClick={(pid, role) => {
          setModalOpen(false);
          if (role === "artist") {
            router.push(`/dashboard/artist/${pid}`);
          } else {
            router.push(`/profile/${pid}`);
          }
        }}
      />
    </>
  );
}

