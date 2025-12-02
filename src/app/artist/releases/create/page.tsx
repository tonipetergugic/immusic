"use client";

import { useEffect, useState } from "react";
import CoverDropzone from "@/components/CoverDropzone";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createReleaseAction } from "./actions";

export default function CreateReleasePage() {
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverTempPath, setCoverTempPath] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [selectedTracks, setSelectedTracks] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    let isCancelled = false;
    const handler = setTimeout(async () => {
      const trimmedTerm = searchTerm.trim();

      if (!trimmedTerm) {
        if (!isCancelled) {
          setSearchResults([]);
          setSearching(false);
        }
        return;
      }

      if (!isCancelled) {
        setSearching(true);
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user?.id) {
          if (!isCancelled) {
            setSearchResults([]);
          }
          return;
        }

        const { data, error } = await supabase
          .from("tracks")
          .select("id, title")
          .eq("artist_id", user.id)
          .ilike("title", `%${trimmedTerm}%`)
          .order("created_at", { ascending: false });

        if (!isCancelled && !error && data) {
          setSearchResults(data);
        }
      } finally {
        if (!isCancelled) {
          setSearching(false);
        }
      }
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(handler);
    };
  }, [searchTerm]);

  return (
    <form
      action={createReleaseAction}
      className="min-h-screen p-10 bg-[#0E0E10] text-white flex flex-col gap-6"
    >
      <h1 className="text-2xl font-bold">Create Release</h1>

      <input
        type="hidden"
        name="selected_tracks"
        value={JSON.stringify(selectedTracks)}
      />
      <input
        type="hidden"
        name="cover_temp_path"
        value={coverTempPath ?? ""}
      />

      <div className="space-y-4 max-w-md">
        <div>
          <label
            htmlFor="release-title"
            className="block mb-1 text-sm text-gray-300"
          >
            Release Title
          </label>
          <input
            id="release-title"
            name="title"
            type="text"
            required
            className="w-full rounded-md bg-[#18181B] border border-[#27272A] px-3 py-2 text-sm text-white outline-none focus:border-[#00FFC6]"
          />
        </div>

        <div>
          <p className="block mb-2 text-sm text-gray-300">Release Type</p>
          <div className="space-y-2">
            {[
              { value: "single", label: "Single" },
              { value: "ep", label: "EP" },
              { value: "album", label: "Album" },
            ].map((option) => (
              <label key={option.value} className="flex items-center gap-2 text-sm text-white/80">
                <input
                  type="radio"
                  name="release_type"
                  value={option.value}
                  required
                  className="text-[#00FFC6] focus:ring-[#00FFC6]"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="block mb-2 text-sm text-gray-300">Release Cover</p>
          <CoverDropzone
            onFileSelected={async (file) => {
              setCoverFile(file);
              if (!file) {
                setCoverTempPath(null);
                return;
              }

              setUploadingCover(true);

              const {
                data: { user },
              } = await supabase.auth.getUser();

              if (!user?.id) {
                setUploadingCover(false);
                return;
              }

              const ext = file.name.split(".").pop();
              const fileSafeName = crypto.randomUUID();
              const filePath = `${user.id}/${fileSafeName}.${ext}`;

              const { error } = await supabase.storage
                .from("release_covers")
                .upload(filePath, file);

              if (!error) {
                setCoverTempPath(filePath);
              }

              setUploadingCover(false);
            }}
          />
        </div>

        <div>
          <p className="block mb-2 text-sm text-gray-300">Select Tracks</p>
          <div className="space-y-2">
            <input
              type="text"
              name="track_search"
              placeholder="Search your tracks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md bg-[#18181B] border border-[#27272A] px-3 py-2 text-sm text-white outline-none focus:border-[#00FFC6]"
            />
            <div className="space-y-1">
              {searching ? (
                <p className="text-sm text-gray-400">Searching...</p>
              ) : searchTerm.length > 0 && searchResults.length === 0 ? (
                <p className="text-sm text-gray-400">No tracks found</p>
              ) : (
                searchResults.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center justify-between rounded-md bg-[#18181B] border border-[#27272A] px-3 py-2 text-sm text-white/80"
                  >
                    <span>{track.title}</span>
                    <button
                      type="button"
                      className="text-xs font-semibold text-[#00FFC6] hover:text-[#00E0B0]"
                      onClick={() => {
                        const alreadySelected = selectedTracks.some(
                          (t) => t.id === track.id
                        );
                        if (!alreadySelected) {
                          setSelectedTracks([...selectedTracks, track]);
                        }
                      }}
                    >
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-300">Selected Tracks</p>
              {selectedTracks.length === 0 ? (
                <p className="text-sm text-gray-400">No tracks selected</p>
              ) : (
                <div className="space-y-1">
                  {selectedTracks.map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center justify-between rounded-md bg-[#18181B] border border-[#27272A] px-3 py-2 text-sm text-white/80"
                    >
                      <span>{track.title}</span>
                      <button
                        type="button"
                        className="text-xs font-semibold text-red-400 hover:text-red-300"
                        onClick={() =>
                          setSelectedTracks(
                            selectedTracks.filter((t) => t.id !== track.id)
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="px-6 py-2 rounded-xl bg-[#00FFC6] text-black font-medium mx-auto mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={uploadingCover}
      >
        Create Release
      </button>
    </form>
  );
}

