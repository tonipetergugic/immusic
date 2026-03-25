"use client";

import ProfileSectionNav from "@/components/ProfileSectionNav";

export default function SettingsPage() {

  return (
    <div className="w-full max-w-[896px] mx-auto">
      <div
        className="
        bg-[#0B0B0D]
        border border-[#1A1A1C]
        rounded-2xl
        p-8
        lg:min-h-[980px]
        shadow-[0_20px_60px_rgba(0,0,0,0.6)]
      "
      >
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
