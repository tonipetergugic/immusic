"use client";

import BackLink from "@/components/BackLink";
import { createReleaseAction } from "./actions";
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={[
        "group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/35 backdrop-blur-xl px-5 py-2.5 text-sm font-semibold text-white/90 transition",
        "hover:bg-black/50 hover:border-[#00FFC6]/70 hover:shadow-[0_0_0_1px_rgba(0,255,198,0.25),0_20px_60px_rgba(0,255,198,0.15)]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60",
        pending ? "opacity-60 cursor-not-allowed hover:shadow-none" : "",
      ].join(" ")}
    >
      {pending ? (
        <span
          className="inline-flex h-4 w-4 animate-spin items-center justify-center rounded-full border border-white/30 border-t-[#00FFC6]"
          aria-hidden
        />
      ) : null}
      <span>{pending ? "Creating…" : "Create Release"}</span>
    </button>
  );
}

export default function CreateReleasePage() {
  return (
    <div className="w-full text-white">
      <div className="w-full max-w-[820px] mx-auto">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <BackLink href="/artist/releases" />

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
              Create Release
            </h1>
            <p className="mt-2 text-sm text-[#B3B3B3]">
              Set the basics. You can add a cover and tracks after creating.
            </p>
          </div>
        </div>

        <form
          action={createReleaseAction}
          className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 sm:p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_0_60px_rgba(0,255,198,0.06),0_30px_90px_rgba(0,0,0,0.55)]"
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
              className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 backdrop-blur-xl px-4 py-3 text-base text-white outline-none transition placeholder:text-white/35 hover:border-white/20 focus:border-[#00FFC6]/60 focus:ring-2 focus:ring-[#00FFC6]/20"
            />
          </div>

          {/* Type */}
          <div>
            <div className="text-sm font-medium text-white/80">Release type</div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { value: "single", label: "Single", desc: "1–2 tracks" },
                { value: "ep", label: "EP", desc: "3–6 tracks" },
                { value: "album", label: "Album", desc: "7+ tracks" },
              ].map((option) => (
                <label
                  key={option.value}
                  className="group relative flex flex-col items-center gap-2"
                >
                  <input
                    type="radio"
                    name="release_type"
                    value={option.value}
                    required
                    defaultChecked={option.value === "single"}
                    className="peer sr-only"
                  />

                  <span
                    className="
    inline-flex min-w-[140px] items-center justify-center
    rounded-xl border border-white/10
    bg-black/30 backdrop-blur-xl
    px-6 py-2.5
    text-sm font-semibold
    cursor-pointer
    text-white/80
    transition
    hover:border-white/20 hover:bg-black/40
    peer-checked:border-[#00FFC6]/60
    peer-checked:bg-[#00FFC6]/10
    peer-checked:text-[#00FFC6]
    peer-checked:shadow-[0_0_0_1px_rgba(0,255,198,0.22),0_20px_60px_rgba(0,255,198,0.10)]
  "
                  >
                    {option.label}
                  </span>

                  <span
                    className="
  text-xs text-white/45
  text-center
  transition
  peer-checked:text-white/70
"
                  >
                    {option.desc}
                  </span>
                </label>
              ))}
            </div>
          </div>

            {/* Actions */}
            <div className="flex items-center justify-center pt-4">
              <SubmitButton />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

