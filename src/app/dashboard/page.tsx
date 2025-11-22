"use client";

import { useEffect, useState } from "react";
import PlaylistCard from "@/components/PlaylistCard";
import { createBrowserClient } from "@supabase/ssr";

export default function DashboardPage() {
  const [playlists, setPlaylists] = useState<any[]>([]);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    async function loadPlaylists() {
      const { data } = await supabase.from("playlists").select("*").order("created_at", { ascending: false });

      if (data && data.length > 0) {
        setPlaylists(data);
      } else {
        // 👇 Dummy Playlists (Fallback)
        setPlaylists([
          {
            id: "dummy-1",
            title: "Uplifting Trance Essentials",
            description: "Handpicked emotional trance tracks.",
            cover_url: "https://dummyimage.com/600x600/00ffc6/ffffff&text=Trance+Essentials",
          },
          {
            id: "dummy-2",
            title: "New Releases",
            description: "Fresh tracks from new artists.",
            cover_url: "https://dummyimage.com/600x600/00ffc6/ffffff&text=New+Releases",
          },
        ]);
      }
    }

    loadPlaylists();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Discover Playlists</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {playlists.map((pl) => (
          <PlaylistCard
            key={pl.id}
            id={pl.id}
            title={pl.title}
            description={pl.description}
            cover_url={pl.cover_url}
          />
        ))}
      </div>
    </div>
  );
}
