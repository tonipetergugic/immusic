"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

export default function TrackListClient({
  tracks,
}: {
  tracks: any[];
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [durations, setDurations] = useState<Record<string, string>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (openMenu && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openMenu]);

  useEffect(() => {
    tracks.forEach((track: any) => {
      if (!track.audio_path) return;

      const audio = new Audio(track.audio_path);
      audio.addEventListener("loadedmetadata", () => {
        const total = Math.floor(audio.duration);
        const minutes = Math.floor(total / 60);
        const seconds = String(total % 60).padStart(2, "0");
        setDurations((prev) => ({
          ...prev,
          [track.id]: `${minutes}:${seconds}`,
        }));
      });
    });
  }, [tracks]);
  if (!tracks || tracks.length === 0) {
    return <p className="text-white/40 mt-10">No tracks uploaded yet.</p>;
  }

  async function saveTitle(trackId: string, newTitle: string) {
    const formData = new FormData();
    formData.append("track_id", trackId);
    formData.append("title", newTitle);

    await fetch("/artist/releases/update-track-title", {
      method: "POST",
      body: formData,
    });
  }

  return (
    <div className="mt-10 flex flex-col gap-2">
      <h2 className="text-xl font-semibold mb-4">Tracks</h2>

      <div className="flex flex-col gap-1">
        {tracks.map((track: any, index: number) => {
          const isEditing = editId === track.id;

          return (
            <div
              key={track.id}
              className={`group flex items-center justify-between
                bg-white/5 hover:bg-white/10 transition
                rounded-lg px-4 py-3
                ${deletingId === track.id ? "opacity-0 transition-opacity duration-300" : ""}
              `}
            >
              {/* LEFT SIDE */}
              <div className="flex items-center gap-4">

                {/* Track number */}
                <span className="w-6 text-white/50 text-sm">
                  {index + 1}
                </span>

                {/* Small cover placeholder */}
                <div
                  className="
                    w-8 h-8 rounded bg-[#1A1A1D]
                    flex items-center justify-center
                    text-white/40 text-xs
                  "
                >
                  ♫
                </div>

                {/* Inline Edit Field */}
                {isEditing ? (
                  <input
                    autoFocus
                    defaultValue={track.title}
                    onBlur={async (e) => {
                      const val = e.target.value.trim();
                      if (val && val !== track.title) {
                        await saveTitle(track.id, val);
                      }
                      setEditId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      }
                    }}
                    className="
                      bg-[#1A1A1D] px-2 py-1 rounded 
                      text-sm text-white outline-none
                      border border-white/20 focus:border-white/40
                      w-48
                    "
                  />
                ) : (
                  <span
                    className="
                      text-white font-medium text-sm cursor-pointer 
                      hover:text-white/80
                    "
                    onClick={() => {
                      setEditId(track.id);
                    }}
                  >
                    {track.title || "Untitled Track"}
                  </span>
                )}
              </div>

              {/* RIGHT SIDE */}
              <div className="flex items-center gap-4">

                {/* Duration */}
                <span className="text-white/40 text-sm">
                  {durations[track.id] || "..."}
                </span>

                {/* More Options */}
                <div className="relative">
                  <button
                    className="
                      p-2 rounded-md hover:bg-white/10 
                      text-white/60 hover:text-white transition
                    "
                    onClick={() => {
                      setOpenMenu(openMenu === track.id ? null : track.id);
                    }}
                  >
                    <MoreHorizontal size={18} />
                  </button>

                  {openMenu === track.id && (
                    <div ref={menuRef}>
                      <div
                        className="
                          absolute right-0 top-10 z-20
                          w-32 bg-[#1A1A1D] border border-white/10
                          rounded-lg shadow-lg p-1
                        "
                      >
                        <button
                          className="
                            w-full text-left text-red-400 text-sm px-3 py-2 
                            hover:bg-white/10 rounded-md
                          "
                          onClick={() => {
                            const sure = confirm("Delete this track?");
                            if (!sure) return;

                            const fd = new FormData();
                            fd.append("track_id", track.id);
                          setDeletingId(track.id);

                            fetch("/artist/releases/delete-track", {
                              method: "POST",
                              body: fd,
                          }).then(() => {
                            window.location.href = window.location.href;
                            });
                          }}
                        >
                          Delete Track
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
