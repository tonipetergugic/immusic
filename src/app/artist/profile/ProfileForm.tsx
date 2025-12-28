"use client";

import { useState } from "react";
import { Instagram, Music2, Facebook, Twitter } from "lucide-react";

type Profile = {
  display_name: string | null;
  location: string | null;
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
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-white/90">Basics</p>
            <p className="text-xs text-[#B3B3B3] mt-1">
              Public profile details shown on your artist page.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col space-y-2">
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
                className="bg-[#1a1a1d] border border-[#333] rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00FFC6]/50 focus:border-[#00FFC6]/50"
              />
            </div>

            <div className="flex flex-col space-y-2">
              <label
                htmlFor="location"
                className="text-sm font-medium text-white/80"
              >
                Location
              </label>
              <input
                id="location"
                type="text"
                name="location"
                defaultValue={profile.location ?? ""}
                className="bg-[#1a1a1d] border border-[#333] rounded-lg p-2 text-white focus:outline-none focus:ring-2 focus:ring-[#00FFC6]/50 focus:border-[#00FFC6]/50"
              />
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <label htmlFor="bio" className="text-sm font-medium text-white/80">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={5}
              defaultValue={profile.bio ?? ""}
              className="bg-[#1a1a1d] border border-[#333] rounded-lg p-2 text-white resize-none focus:outline-none focus:ring-2 focus:ring-[#00FFC6]/50 focus:border-[#00FFC6]/50"
            />
            <p className="text-xs text-[#B3B3B3]">
              Tip: Keep it short and clear. (UI preview)
            </p>
          </div>
        </div>

        <div className="h-px bg-white/10" />

        {/* Social links */}
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-white/90">Social links</p>
            <p className="text-xs text-[#B3B3B3] mt-1">
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
              <div className="flex items-center gap-2 rounded-xl border border-[#333] bg-[#1a1a1d] px-3 py-2 focus-within:ring-2 focus-within:ring-[#00FFC6]/50 focus-within:border-[#00FFC6]/50">
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
              <p className="text-xs text-[#B3B3B3]">
                Paste the full link (recommended).
              </p>
            </div>

            <div className="flex flex-col space-y-2">
              <label htmlFor="tiktok" className="text-sm font-medium text-white/80">
                TikTok
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-[#333] bg-[#1a1a1d] px-3 py-2 focus-within:ring-2 focus-within:ring-[#00FFC6]/50 focus-within:border-[#00FFC6]/50">
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
              <p className="text-xs text-[#B3B3B3]">
                Paste the full link (recommended).
              </p>
            </div>

            <div className="flex flex-col space-y-2">
              <label
                htmlFor="facebook"
                className="text-sm font-medium text-white/80"
              >
                Facebook
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-[#333] bg-[#1a1a1d] px-3 py-2 focus-within:ring-2 focus-within:ring-[#00FFC6]/50 focus-within:border-[#00FFC6]/50">
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
              <p className="text-xs text-[#B3B3B3]">
                Use your page link.
              </p>
            </div>

            <div className="flex flex-col space-y-2">
              <label htmlFor="x" className="text-sm font-medium text-white/80">
                X
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-[#333] bg-[#1a1a1d] px-3 py-2 focus-within:ring-2 focus-within:ring-[#00FFC6]/50 focus-within:border-[#00FFC6]/50">
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
              <p className="text-xs text-[#B3B3B3]">
                Paste the full link (x.com/…).
              </p>
            </div>
          </div>
        </div>

        <div className="h-px bg-white/10" />

        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          {dirty && (
            <span className="text-xs text-[#B3B3B3]">
              Unsaved changes
            </span>
          )}

          <button
            type="submit"
            disabled={!dirty}
            className={`group relative inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
              dirty
                ? "bg-[#00FFC6] text-black hover:bg-[#00E0B0] shadow-[0_0_0_1px_rgba(0,255,198,0.25),0_12px_40px_rgba(0,255,198,0.12)]"
                : "bg-white/10 text-white/40 cursor-not-allowed shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
            } focus:outline-none focus:ring-2 focus:ring-[#00FFC6]/60 focus:ring-offset-2 focus:ring-offset-black`}
          >
            <span className="relative">
              Save changes
            </span>
          </button>
        </div>
      </div>
    </form>
  );
}

