"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="w-full min-h-screen bg-[#0E0E10] text-white p-10">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.back()}
          className="
            flex items-center gap-2 mb-8
            text-[#B3B3B3] hover:text-[#00FFC6]
            transition-colors duration-200
          "
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>

        {/* Title */}
        <h1 className="text-2xl font-semibold mb-2">Settings</h1>
        <p className="text-[#B3B3B3] mb-8">
          Adjust your preferences and application settings.
        </p>

        {/* Theme Placeholder */}
        <div className="mb-10">
          <h2 className="text-lg font-medium mb-3">Theme</h2>
          <div
            className="
              w-full bg-[#1A1A1C] border border-[#1A1A1C]
              rounded-lg p-3 text-white
            "
          >
            <span className="text-[#555]">Theme options coming soon...</span>
          </div>
        </div>

        {/* Language Placeholder */}
        <div className="mb-10">
          <h2 className="text-lg font-medium mb-3">Language</h2>
          <div
            className="
              w-full bg-[#1A1A1C] border border-[#1A1A1C]
              rounded-lg p-3 text-white
            "
          >
            <span className="text-[#555]">Language settings coming soon...</span>
          </div>
        </div>

      </div>
    </div>
  );
}

