"use client";

import { useEffect, useState } from "react";
import AvatarSection from "./AvatarSection";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ArtistProfilePage() {
  const supabase = createSupabaseBrowserClient();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("id, email, display_name, avatar_url, role")
        .eq("id", user.id)
        .single();

      setProfile(data);
      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return <main className="p-6 text-white">Loading...</main>;
  }

  if (!profile) {
    return <main className="p-6 text-white">No profile found.</main>;
  }

  return (
    <main className="min-h-screen bg-[#0E0E10] text-white px-6 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">
          Artist Profile
        </h1>
        <p className="text-sm text-neutral-400 mb-8">
          Manage your public artist information.
        </p>

        <div className="space-y-8">
          <section className="rounded-xl bg-[#1A1A1A] p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Profile Details</h2>

            <AvatarSection avatarUrl={profile.avatar_url} />

            <div className="text-[#B3B3B3] space-y-2 mt-4">
              <p><strong>ID:</strong> {profile.id}</p>
              <p><strong>Email:</strong> {profile.email}</p>
              <p><strong>Display Name:</strong> {profile.display_name}</p>
              <p><strong>Role:</strong> {profile.role}</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
