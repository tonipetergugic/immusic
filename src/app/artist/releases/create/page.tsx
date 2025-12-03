"use client";

import { createReleaseAction } from "./actions";

export default function CreateReleasePage() {
  return (
    <form
      action={createReleaseAction}
      className="min-h-screen p-10 bg-[#0E0E10] text-white flex flex-col gap-6"
    >
      <h1 className="text-2xl font-bold">Create Release</h1>

      <div className="space-y-4 max-w-md">
        <div>
          <label htmlFor="release-title" className="block mb-1 text-sm text-gray-300">
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
      </div>

      <button
        type="submit"
        className="px-6 py-2 rounded-xl bg-[#00FFC6] text-black font-medium mx-auto mt-8"
      >
        Create Release
      </button>
    </form>
  );
}

