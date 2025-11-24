"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function AccountPage() {
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
        <h1 className="text-2xl font-semibold mb-2">Account</h1>
        <p className="text-[#B3B3B3] mb-8">
          Manage your email and security settings.
        </p>

        {/* Email Placeholder */}
        <div className="mb-10">
          <h2 className="text-lg font-medium mb-3">Email</h2>
          <div
            className="
              w-full bg-[#1A1A1C] border border-[#1A1A1C]
              rounded-lg p-3 text-white
            "
          >
            <span className="text-[#555]">Email settings coming soon...</span>
          </div>
        </div>

        {/* Security Placeholder */}
        <div className="mb-10">
          <h2 className="text-lg font-medium mb-3">Security</h2>
          <div
            className="
              w-full bg-[#1A1A1C] border border-[#1A1A1C]
              rounded-lg p-3 text-white
            "
          >
            <span className="text-[#555]">Password & security options coming soon...</span>
          </div>
        </div>

      </div>
    </div>
  );
}

