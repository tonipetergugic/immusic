"use client";

import { useEffect, useState } from "react";
import ProfileSectionNav from "@/components/ProfileSectionNav";
import BackLink from "@/components/BackLink";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { updateHideExplicitTracks } from "@/app/(topbar)/profile/actions";

export default function SettingsPage() {
  const [hideExplicitTracks, setHideExplicitTracks] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [savingExplicitPreference, setSavingExplicitPreference] = useState(false);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    let isMounted = true;

    async function loadPreferences() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (isMounted) setPreferencesLoaded(true);
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("hide_explicit_tracks")
          .eq("id", user.id)
          .single();

        if (!error && isMounted) {
          setHideExplicitTracks(!!profile?.hide_explicit_tracks);
        }
      } catch (error) {
        console.log("loadPreferences error", error);
      } finally {
        if (isMounted) setPreferencesLoaded(true);
      }
    }

    loadPreferences();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  async function handleExplicitPreferenceChange(nextValue: boolean) {
    const previousValue = hideExplicitTracks;

    setHideExplicitTracks(nextValue);
    setSavingExplicitPreference(true);

    try {
      await updateHideExplicitTracks(nextValue);
    } catch (error) {
      console.log("updateHideExplicitTracks error", error);
      setHideExplicitTracks(previousValue);
      alert("Failed to update explicit content preference.");
    } finally {
      setSavingExplicitPreference(false);
    }
  }

  return (
    <div className="w-full max-w-[896px] mx-auto">
      <div
        className="
        bg-[#0B0B0D]
        border border-[#1A1A1C]
        rounded-2xl
        p-8
        lg:min-h-[1040px]
        shadow-[0_20px_60px_rgba(0,0,0,0.6)]
      "
      >
        <BackLink className="mb-6" />
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold leading-tight">Settings</h1>
          <p className="text-[#B3B3B3] mt-1">
            Adjust your preferences and application settings.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-10">
          <aside className="lg:pr-8 lg:border-r lg:border-[#1A1A1C]">
            <ProfileSectionNav current="settings" />
          </aside>

          <div className="min-w-0">
            {/* Content preferences */}
            <div className="mt-2">
              <div className="text-sm text-[#B3B3B3] mb-2">Content</div>

              <div
                className="
            rounded-xl
            border border-[#1A1A1C]
            bg-[#111113]
            px-4 py-4
          "
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-white/90 font-medium">Hide explicit tracks</div>
                    <div className="text-sm text-[#B3B3B3] mt-1">
                      Explicit songs will be hidden across the platform when this setting is enabled.
                    </div>
                    <div className="text-xs text-[#7A7A7A] mt-2">
                      {!preferencesLoaded
                        ? "Loading preference..."
                        : savingExplicitPreference
                        ? "Saving..."
                        : hideExplicitTracks
                        ? "Explicit tracks are currently hidden."
                        : "Explicit tracks are currently visible."}
                    </div>
                  </div>

                  <label className="inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={hideExplicitTracks}
                      disabled={!preferencesLoaded || savingExplicitPreference}
                      onChange={(event) =>
                        handleExplicitPreferenceChange(event.target.checked)
                      }
                    />
                    <div
                      className="
                  relative h-6 w-11 rounded-full
                  bg-[#2A2A2D]
                  transition-colors
                  peer-checked:bg-[#00FFC6]
                  peer-disabled:opacity-50
                  after:absolute after:left-[2px] after:top-[2px]
                  after:h-5 after:w-5 after:rounded-full
                  after:bg-white after:transition-transform
                  peer-checked:after:translate-x-5
                "
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Theme */}
            <div className="mt-2">
              <div className="text-sm text-[#B3B3B3] mb-2">Theme</div>

              <div
                className="
            rounded-xl
            border border-[#1A1A1C]
            bg-[#111113]
            px-4 py-4
          "
              >
                <div className="text-white/90 font-medium">Theme options coming soon</div>
                <div className="text-sm text-[#B3B3B3] mt-1">
                  Light mode and custom themes will appear here later.
                </div>
              </div>
            </div>

            {/* Language */}
            <div className="mt-8">
              <div className="text-sm text-[#B3B3B3] mb-2">Language</div>

              <div
                className="
            rounded-xl
            border border-[#1A1A1C]
            bg-[#111113]
            px-4 py-4
          "
              >
                <div className="text-white/90 font-medium">Language settings coming soon</div>
                <div className="text-sm text-[#B3B3B3] mt-1">
                  You&apos;ll be able to choose your app language here.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
