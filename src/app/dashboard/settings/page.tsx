"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { updateHideExplicitTracks } from "@/app/(topbar)/profile/actions";
import ProfileSectionLayout from "@/components/ProfileSectionLayout";

function showNotice(message: string) {
  window.dispatchEvent(
    new CustomEvent("immusic:notice", { detail: { message } })
  );
}

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
        console.error("loadPreferences error:", error);
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
      window.dispatchEvent(
        new CustomEvent("immusic:explicit-playback-preference-changed", {
          detail: { hideExplicitTracks: nextValue },
        })
      );
    } catch (error) {
      console.error("updateHideExplicitTracks error:", error);
      setHideExplicitTracks(previousValue);
      showNotice("Failed to update explicit content preference.");
    } finally {
      setSavingExplicitPreference(false);
    }
  }

  return (
    <ProfileSectionLayout
      title="Settings"
      description="Adjust your preferences and application settings."
      current="settings"
    >
      {/* Content preferences */}
      <div className="mt-2 border-b border-white/10 pb-10">
        <div className="mb-6 text-sm text-[#B3B3B3]">Content</div>

        <div className="flex items-start justify-between gap-8">
          <div className="min-w-0 max-w-[720px]">
            <div className="text-[24px] font-semibold tracking-tight text-white">
              Block explicit playback
            </div>

            <div className="mt-3 text-[15px] leading-7 text-[#B3B3B3]">
              Explicit tracks remain visible across the platform, but playback is blocked when this setting is enabled.
            </div>

            <div className="mt-4 text-sm text-[#7A7A7A]">
              {!preferencesLoaded
                ? "Loading preference..."
                : savingExplicitPreference
                ? "Saving..."
                : hideExplicitTracks
                ? "Explicit playback is currently blocked."
                : "Explicit playback is currently allowed."}
            </div>
          </div>

          <label className="inline-flex shrink-0 cursor-pointer items-center pt-1">
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
                relative h-7 w-12 rounded-full
                bg-[#2A2A2D]
                transition-colors
                peer-checked:bg-[#00FFC6]
                peer-disabled:opacity-50
                after:absolute after:left-[2px] after:top-[2px]
                after:h-6 after:w-6 after:rounded-full
                after:bg-white after:transition-transform
                peer-checked:after:translate-x-5
              "
            />
          </label>
        </div>
      </div>

    </ProfileSectionLayout>
  );
}
