"use client";

import { useState } from "react";
import {
  Instagram,
  Music2,
  Facebook,
  Twitter,
  UserRound,
  Share2,
} from "lucide-react";

const inputBase =
  "bg-[#141417] border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-[#B3B3B3]/60 " +
  "transition focus:outline-none focus:ring-2 focus:ring-[#00FFC6]/35 focus:border-[#00FFC6]/40 " +
  "hover:border-white/20";

type Profile = {
  display_name: string | null;
  country: string | null;
  city: string | null;
  bio: string | null;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  x: string | null;
};

export default function ProfileForm({
  profile,
  updateAction,
}: {
  profile: Profile;
  updateAction: (formData: FormData) => void | Promise<void>;
}) {
  const [dirty, setDirty] = useState(false);

  return (
    <form
      action={updateAction}
      className="space-y-6 rounded-xl border border-white/10 bg-white/5 p-6"
      onChange={() => setDirty(true)}
    >
      <div className="space-y-6">
        {/* Basics */}
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-3">
              <UserRound className="h-5 w-5 text-[#00FFC6]" />
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Basics
              </h2>
            </div>
            <p className="mt-2 text-sm text-[#B3B3B3]">
              Public profile details shown on your artist page.
            </p>
          </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col space-y-3">
            <label
              htmlFor="display_name"
              className="text-sm font-medium text-white/80"
            >
              Artist name (display name)
            </label>
            <input
              id="display_name"
              type="text"
              name="display_name"
              defaultValue={profile.display_name ?? ""}
              className={inputBase}
            />
          </div>

          <div />

          <div className="flex flex-col space-y-2">
            <label
              htmlFor="city"
              className="text-sm font-medium text-white/80"
            >
              City
            </label>
            <input
              id="city"
              type="text"
              name="city"
              defaultValue={profile.city ?? ""}
              placeholder="e.g. Frankfurt am Main"
              className={inputBase}
            />
          </div>

          <div className="flex flex-col space-y-2">
            <label
              htmlFor="country"
              className="text-sm font-medium text-white/80"
            >
              Country
            </label>
            <input
              id="country"
              type="text"
              name="country"
              defaultValue={profile.country ?? ""}
              placeholder="e.g. Germany"
              className={inputBase}
            />
          </div>
        </div>

          <div className="flex flex-col space-y-3">
            <label htmlFor="bio" className="text-sm font-medium text-white/80">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={5}
              defaultValue={profile.bio ?? ""}
              className={`${inputBase} resize-none`}
            />
            <p className="text-sm text-[#B3B3B3]">
              Tip: Keep it short and clear. (UI preview)
            </p>
          </div>
        </div>

        <div className="my-2 h-px bg-white/10" />

        {/* Social links */}
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-3">
              <Share2 className="h-5 w-5 text-[#00FFC6]" />
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Social links
              </h2>
            </div>
            <p className="mt-2 text-sm text-[#B3B3B3]">
              Add links to help listeners find you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-2">
              <label
                htmlFor="instagram"
                className="text-sm font-medium text-white/80"
              >
                Instagram
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 backdrop-blur-sm transition hover:border-white/20 focus-within:ring-2 focus-within:ring-[#00FFC6]/35 focus-within:border-[#00FFC6]/40">
                <span className="h-8 w-8 rounded-lg border border-white/10 bg-black/20 flex items-center justify-center">
                  <Instagram size={16} className="text-[#B3B3B3]" />
                </span>
                <input
                  id="instagram"
                  type="text"
                  name="instagram"
                  defaultValue={profile.instagram ?? ""}
                  placeholder="https://instagram.com/yourname"
                  className="flex-1 bg-transparent text-white placeholder:text-[#B3B3B3]/60 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <label htmlFor="tiktok" className="text-sm font-medium text-white/80">
                TikTok
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 backdrop-blur-sm transition hover:border-white/20 focus-within:ring-2 focus-within:ring-[#00FFC6]/35 focus-within:border-[#00FFC6]/40">
                <span className="h-8 w-8 rounded-lg border border-white/10 bg-black/20 flex items-center justify-center">
                  <Music2 size={16} className="text-[#B3B3B3]" />
                </span>
                <input
                  id="tiktok"
                  type="text"
                  name="tiktok"
                  defaultValue={profile.tiktok ?? ""}
                  placeholder="https://tiktok.com/@yourname"
                  className="flex-1 bg-transparent text-white placeholder:text-[#B3B3B3]/60 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <label
                htmlFor="facebook"
                className="text-sm font-medium text-white/80"
              >
                Facebook
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 backdrop-blur-sm transition hover:border-white/20 focus-within:ring-2 focus-within:ring-[#00FFC6]/35 focus-within:border-[#00FFC6]/40">
                <span className="h-8 w-8 rounded-lg border border-white/10 bg-black/20 flex items-center justify-center">
                  <Facebook size={16} className="text-[#B3B3B3]" />
                </span>
                <input
                  id="facebook"
                  type="text"
                  name="facebook"
                  defaultValue={profile.facebook ?? ""}
                  placeholder="https://facebook.com/yourpage"
                  className="flex-1 bg-transparent text-white placeholder:text-[#B3B3B3]/60 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <label htmlFor="x" className="text-sm font-medium text-white/80">
                X
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 backdrop-blur-sm transition hover:border-white/20 focus-within:ring-2 focus-within:ring-[#00FFC6]/35 focus-within:border-[#00FFC6]/40">
                <span className="h-8 w-8 rounded-lg border border-white/10 bg-black/20 flex items-center justify-center">
                  <Twitter size={16} className="text-[#B3B3B3]" />
                </span>
                <input
                  id="x"
                  type="text"
                  name="x"
                  defaultValue={profile.x ?? ""}
                  placeholder="https://x.com/yourhandle"
                  className="flex-1 bg-transparent text-white placeholder:text-[#B3B3B3]/60 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="my-2 h-px bg-white/10" />

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <span className={dirty ? "text-xs text-[#B3B3B3]" : "invisible text-xs"}>
            Unsaved changes
          </span>

          <button
            type="submit"
            disabled={!dirty}
            className={[
              "group inline-flex cursor-pointer items-center gap-3 rounded-xl border border-[#00FFC6]/40 bg-white/[0.02] px-6 py-3",
              "text-[#00FFC6] text-sm font-semibold tracking-tight",
              "shadow-[0_0_0_1px_rgba(0,255,198,0.12)] transition",
              "hover:bg-white/[0.04] hover:border-[#00FFC6]/60 hover:shadow-[0_0_0_1px_rgba(0,255,198,0.22),0_18px_50px_rgba(0,255,198,0.10)]",
              "active:translate-y-[1px]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00FFC6]/60",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none",
            ].join(" ")}
          >
            <span>Save changes</span>
          </button>
        </div>
      </div>
    </form>
  );
}

