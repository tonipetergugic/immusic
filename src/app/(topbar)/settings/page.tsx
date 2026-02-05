"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="
            inline-flex items-center justify-center
            w-10 h-10 rounded-xl
            bg-[#111113]
            border border-[#1A1A1C]
            text-[#B3B3B3]
            hover:border-[#00FFC6]
            hover:text-[#00FFC6]
            transition
          "
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1">
          <h1 className="text-2xl font-semibold leading-tight">Settings</h1>
          <p className="text-[#B3B3B3] mt-1">
            Adjust your preferences and application settings.
          </p>
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
  );
}

