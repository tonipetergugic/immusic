"use client";

import TrackCard from "@/components/TrackCard";

export default function DashboardPage() {
  // Temporäre Dummy-Daten, bis Artist Upload fertig ist
  const dummyTrack = {
    id: "test-123",
    title: "Test Track",
    artist: "ImMusic Test Artist",
    cover_url: "https://dummyimage.com/300x300/00ffc6/ffffff.jpg&text=Cover",
    audio_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    created_at: new Date().toISOString(),
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Discover New Tracks</h2>

      <div className="grid grid-cols-5 gap-6">
        <TrackCard track={dummyTrack} />
      </div>
    </div>
  );
}
