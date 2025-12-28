"use client";

import { createReleaseAction } from "./actions";
import { Plus } from "lucide-react";

export default function CreateReleasePage() {
  return (
    <div className="w-full max-w-[900px] mx-auto text-white px-6 py-6 lg:px-10 lg:py-8 pb-40 lg:pb-48">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight">Create Release</h1>
          <p className="mt-2 text-sm text-[#B3B3B3]">
            Set the basics. You can add a cover and tracks after creating.
          </p>
        </div>
      </div>

      <form
        action={createReleaseAction}
        className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8"
      >
        <div className="grid gap-8">
          {/* Title */}
          <div>
            <label htmlFor="release-title" className="block text-sm font-medium text-white/80">
              Release title
            </label>
            <input
              id="release-title"
              name="title"
              type="text"
              required
              placeholder="e.g. Come On"
              className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#00FFC6]/60 focus:ring-2 focus:ring-[#00FFC6]/20"
            />
          </div>

          {/* Type */}
          <div>
            <div className="text-sm font-medium text-white/80">Release type</div>

            <div className="mt-3 inline-flex rounded-full bg-white/[0.04] p-1">
              {[
                { value: "single", label: "Single", desc: "1–2 tracks" },
                { value: "ep", label: "EP", desc: "3–6 tracks" },
                { value: "album", label: "Album", desc: "7+ tracks" },
              ].map((option) => (
                <label key={option.value} className="group relative flex flex-col items-center px-1">
                  <input
                    type="radio"
                    name="release_type"
                    value={option.value}
                    required
                    className="peer sr-only"
                  />

                  <span
                    className="
            inline-flex items-center justify-center
            px-4 py-2 text-sm font-semibold
            rounded-full cursor-pointer
            text-white/60
            transition
            hover:text-white
            peer-checked:bg-[#00FFC6]
            peer-checked:text-black
          "
                  >
                    {option.label}
                  </span>

                  <span
                    className="
            mt-1 text-xs
            text-white/40
            transition
            peer-checked:text-[#00FFC6]
          "
                  >
                    {option.desc}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/[0.06] hover:border-[#00FFC6]/60 hover:shadow-[0_0_0_1px_rgba(0,255,198,0.25),0_20px_60px_rgba(0,255,198,0.15)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60"
            >
              <Plus
                size={16}
                strokeWidth={2.5}
                className="text-white/70 transition group-hover:text-[#00FFC6]"
              />
              <span>Create Release</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

