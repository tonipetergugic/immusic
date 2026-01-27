"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import BannerPreview from "./BannerPreview";
import { setBannerUrlAction } from "./bannerActions";

export default function BannerUpload({
  userId,
  currentBannerUrl,
}: {
  userId: string;
  currentBannerUrl: string | null;
}) {
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  const supabase = createSupabaseBrowserClient();

  async function cleanupOtherFilesInPrefix(params: {
    bucket: string;
    prefix: string;
    keepFullPath: string;
  }) {
    try {
      const { bucket, prefix, keepFullPath } = params;

      const { data: listed, error: listErr } = await supabase.storage
        .from(bucket)
        .list(prefix, { limit: 100, offset: 0 });

      if (listErr) {
        return;
      }

      const toDelete =
        (listed ?? [])
          .map((f) => `${prefix}/${f.name}`)
          .filter((fullPath) => fullPath !== keepFullPath);

      if (toDelete.length === 0) return;

      const { error: delErr } = await supabase.storage.from(bucket).remove(toDelete);
      if (delErr) {
        return;
      }

    } catch (e) {
    }
  }

  const handleUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMessage(null);

    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
      const filePath = `${userId}/banner-${crypto.randomUUID()}.${safeExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("profile-banners")
        .upload(filePath, file, { upsert: false });



      if (uploadError) {
        setErrorMessage(uploadError.message);
        return;
      }

      await cleanupOtherFilesInPrefix({
        bucket: "profile-banners",
        prefix: userId,
        keepFullPath: filePath, // keep the banner file that was just uploaded
      });

      const { data: publicData } = supabase.storage
        .from("profile-banners")
        .getPublicUrl(filePath);


      if (!publicData?.publicUrl) {
        setErrorMessage("No public URL returned from Supabase.");
        return;
      }

      await setBannerUrlAction(publicData.publicUrl);

      router.refresh();
      window.location.href = "/artist/profile?banner-updated=1";
    } catch (err: any) {
      console.error("Banner upload unexpected error:", err);

      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else if (typeof err === "string") {
        setErrorMessage(err);
      } else {
        setErrorMessage(JSON.stringify(err));
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <BannerPreview url={currentBannerUrl} />

      <input
        id="banner_upload_input"
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />

      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor="banner_upload_input"
          className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition border ${
            uploading
              ? "bg-white/5 text-white/50 border-white/10 cursor-not-allowed"
              : "bg-white/5 text-white/90 border-white/10 hover:border-[#00FFC6]/40 hover:bg-[#00FFC6]/5 hover:shadow-[0_0_0_1px_rgba(0,255,198,0.15)] cursor-pointer"
          } focus:outline-none focus:ring-2 focus:ring-[#00FFC6]/30`}
        >
          {uploading ? "Uploading…" : "Upload banner"}
        </label>

        <span className="text-xs text-[#B3B3B3]">
          JPG/PNG • Recommended 1600×400
        </span>
      </div>
      {errorMessage && (
        <p className="text-sm text-red-400">Upload error: {errorMessage}</p>
      )}
    </div>
  );
}


