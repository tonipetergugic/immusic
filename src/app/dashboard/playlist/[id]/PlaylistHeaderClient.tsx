"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PlayerTrack } from "@/types/playerTrack";
import type { Playlist } from "@/types/database";
import BackLink from "@/components/BackLink";
import { Trash2 } from "lucide-react";
import { useFitText } from "@/components/useFitText";

type PlaylistOwnerJoin = {
  owner?: {
    id: string;
    display_name: string | null;
    role?: string | null;
  } | null;
};

export default function PlaylistHeaderClient({
  playlist,
  playerTracks,
  onEditCover,
  onCoverUpdated,
  isOwner,
}: {
  playlist: Playlist & PlaylistOwnerJoin;
  playerTracks: PlayerTrack[];
  onEditCover: () => void;
  onCoverUpdated: (newRelPathOrNull: string | null) => void;
  isOwner: boolean;
}) {
  const { currentTrack, isPlaying } = usePlayer();

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [coverBusy, setCoverBusy] = useState(false);

  async function replaceCover(file: File) {
    if (!isOwner) return;

    setCoverBusy(true);
    try {
      // load fresh cover_url (relative path) from DB to delete safely
      const { data: fresh, error: freshErr } = await supabase
        .from("playlists")
        .select("cover_url")
        .eq("id", playlist.id)
        .single<{ cover_url: string | null }>();

      if (freshErr) {
        console.error("Failed to load current cover_url:", freshErr);
      }

      const currentRel = fresh?.cover_url ?? null;

      if (currentRel) {
        const { error: removeErr } = await supabase.storage
          .from("playlist-covers")
          .remove([currentRel]);

        if (removeErr) {
          console.error("Failed to remove old cover from storage:", removeErr);
        }
      }

      const ext = file.name.split(".").pop() || "jpg";
      const newRel = `${playlist.id}/cover-${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("playlist-covers")
        .upload(newRel, file, { upsert: false });

      if (uploadErr) {
        console.error("Cover upload failed:", uploadErr);
        return;
      }

      const { error: dbErr } = await supabase
        .from("playlists")
        .update({ cover_url: newRel })
        .eq("id", playlist.id);

      if (dbErr) {
        console.error("Cover DB update failed:", dbErr);
        return;
      }

      onCoverUpdated(newRel);
    } finally {
      setCoverBusy(false);
    }
  }

  async function deleteCover() {
    if (!isOwner) return;
    if (coverBusy) return;

    const ok = window.confirm("Delete cover?");
    if (!ok) return;

    setCoverBusy(true);
    try {
      // load fresh cover_url (relative path) from DB to delete safely
      const { data: fresh, error: freshErr } = await supabase
        .from("playlists")
        .select("cover_url")
        .eq("id", playlist.id)
        .single<{ cover_url: string | null }>();

      if (freshErr) {
        console.error("Failed to load current cover_url:", freshErr);
      }

      const currentRel = fresh?.cover_url ?? null;

      // 1) clear DB ref first (makes UI empty as soon as state refreshes)
      const { error: dbErr } = await supabase
        .from("playlists")
        .update({ cover_url: null })
        .eq("id", playlist.id);

      if (dbErr) {
        console.error("Cover DB clear failed:", dbErr);
        return;
      }

      onCoverUpdated(null);

      // 2) best-effort storage delete (only if we have a rel path)
      if (currentRel) {
        const { error: removeErr } = await supabase.storage
          .from("playlist-covers")
          .remove([currentRel]);

        if (removeErr) {
          console.error("Failed to remove cover from storage:", removeErr);
        }
      }
    } finally {
      setCoverBusy(false);
    }
  }

  function onCoverClick() {
    if (!isOwner) return;
    fileInputRef.current?.click();
  }

  function onCoverDragOver(e: React.DragEvent) {
    if (!isOwner) return;
    e.preventDefault();
    e.stopPropagation();
  }

  function onCoverDrop(e: React.DragEvent) {
    if (!isOwner) return;
    e.preventDefault();
    e.stopPropagation();

    const f = e.dataTransfer.files?.[0] ?? null;
    if (!f) return;
    if (!f.type.startsWith("image/")) return;

    void replaceCover(f);
  }

  const isActive =
    !!currentTrack &&
    isPlaying &&
    playerTracks.some((track) => track.id === currentTrack.id);

  const isPublic = !!playlist.is_public;

  const rawCover = playlist.cover_url ?? null;

  const fitTitle = useFitText<HTMLHeadingElement>(playlist.title, {
    rangesByMinViewportPx: {
      0: { minPx: 26, maxPx: 34, stepPx: 1 },       // mobile
      640: { minPx: 34, maxPx: 48, stepPx: 2 },     // sm
      768: { minPx: 28, maxPx: 40, stepPx: 1 },     // md (tablet) - slightly smaller
      1024: { minPx: 36, maxPx: 48, stepPx: 2 },    // lg (sidebar sichtbar)
      1280: { minPx: 44, maxPx: 72, stepPx: 2 },    // xl desktop hero
    },
  });

  // Next/Image braucht eine echte URL (http/https) oder einen lokalen /public Pfad.
  // Bei uns darf hier nur eine absolute Public URL durch.
  const coverPublicUrl =
    typeof rawCover === "string" && /^https?:\/\//i.test(rawCover)
      ? rawCover
      : null;

  return (
    <div className="rounded-xl overflow-hidden relative">
      {/* BACKGROUND BLOOM */}
      <div
        className="
          absolute inset-0 bg-cover bg-center
          blur-[40px] opacity-80 brightness-125 saturate-125
          pointer-events-none
        "
        style={{
          backgroundImage: coverPublicUrl ? `url('${coverPublicUrl}')` : undefined,
        }}
      />

      {/* DARK OVERLAY */}
      <div className="absolute inset-0 bg-[rgba(0,0,0,0.40)] pointer-events-none" />

      {/* SOFT FADE GRADIENT (nach unten auslaufend) */}
      <div
        className="
          absolute inset-0
          bg-gradient-to-b
          from-[rgba(0,0,0,0.00)]
          via-[rgba(0,0,0,0.25)]
          via-[rgba(0,0,0,0.45)]
          to-[rgba(14,14,16,0.95)]
          pointer-events-none
        "
      />

      {/* CONTENT */}
      <div className="relative z-10 pt-10 pb-14 px-10">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            e.currentTarget.value = "";
            if (!f) return;
            void replaceCover(f);
          }}
        />
        <div className="mb-6">
          <BackLink />
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-end gap-10">
          {/* COVER */}
          <div
            className={`
              transition-all duration-500
              ${isActive ? "scale-[1.02]" : "scale-100"}
            `}
          >
            <div
              onClick={isOwner ? onCoverClick : undefined}
              onDragOver={isOwner ? onCoverDragOver : undefined}
              onDrop={isOwner ? onCoverDrop : undefined}
              className={`
                group relative w-[220px] h-[220px] md:w-[280px] md:h-[280px]
                rounded-xl overflow-hidden
                border border-[#1A1A1C] bg-gradient-to-br from-neutral-900 to-neutral-800
                flex items-center justify-center
                ${isOwner ? "cursor-pointer" : "cursor-default"}
              `}
            >
              {coverPublicUrl ? (
                <Image
                  src={coverPublicUrl}
                  alt={playlist.title}
                  fill
                  priority
                  sizes="(min-width: 768px) 280px, 220px"
                  className="object-cover rounded-xl"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-white/50 pointer-events-none select-none">
                  <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4 17V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm4-6 3 3 4-4"
                      stroke="#00FFC6"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  <p className="mt-2 text-sm font-medium text-white/80">
                    Click or drag & drop to upload
                  </p>

                  <p className="mt-1 text-xs text-white/50">
                    JPG, PNG · recommended 1:1
                  </p>
                </div>
              )}
              {coverBusy ? (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                  <div className="text-xs font-semibold text-white/80">
                    Uploading…
                  </div>
                </div>
              ) : null}

              {/* Delete icon (only when cover exists) */}
              {isOwner && rawCover ? (
                <button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    await deleteCover();
                  }}
                  className={[
                    "absolute bottom-3 right-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-xl border",
                    "border-white/10 bg-black/40 backdrop-blur-md",
                    "opacity-0 transition group-hover:opacity-100",
                    "hover:border-red-400/40 hover:bg-red-500/10 hover:shadow-[0_0_0_1px_rgba(248,113,113,0.25)]",
                    coverBusy ? "pointer-events-none opacity-40" : "",
                  ].join(" ")}
                  aria-label="Delete cover"
                  title="Delete cover"
                >
                  <Trash2 className="h-5 w-5 text-red-300" />
                </button>
              ) : null}
            </div>
          </div>

          {/* TEXT SECTION */}
          <div className="flex flex-col gap-3 w-full">
            <h1
              ref={fitTitle.ref}
              className="
                font-semibold text-white tracking-tight leading-tight
                text-[34px] sm:text-5xl md:text-6xl lg:text-5xl xl:text-7xl
                max-w-[70vw] md:max-w-[600px]
                truncate
              "
            >
              {playlist.title}
            </h1>

            <p className="text-white/90 text-lg font-medium max-w-lg">
              {playlist.description || "EDM Playlist"}
            </p>

            <p className="text-white/90 text-lg font-medium mt-2">
              {playerTracks.length} Tracks
            </p>

            <p className="text-white/70 text-sm mt-1">
              {isPublic ? "Public playlist" : "Private playlist"}
            </p>

            {playlist.owner?.id ? (
              <p className="text-white/60 text-sm mt-1">
                Playlist by{" "}
                <a
                  href={
                    playlist.owner.role === "artist"
                      ? `/dashboard/artist/${playlist.owner.id}`
                      : `/profile/${playlist.owner.id}`
                  }
                  className="hover:text-white underline underline-offset-2 transition"
                >
                  {playlist.owner.display_name ?? "Unknown"}
                </a>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

