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
  console.log("Supabase client initialized:", supabase);

  const handleUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMessage(null);

    try {
      const filePath = `${userId}/banner.jpg`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("profile-banners")
        .upload(filePath, file, { upsert: true });

      console.log("Upload raw result:", uploadData, uploadError);

      console.log("Banner upload result:", { uploadData, uploadError });

      if (uploadError) {
        setErrorMessage(uploadError.message);
        return;
      }

      const { data: publicData } = supabase.storage
        .from("profile-banners")
        .getPublicUrl(filePath);

      console.log("Banner public URL:", publicData);

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
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="text-white"
      />

      {uploading && <p className="text-sm text-white">Uploading...</p>}
      {errorMessage && (
        <p className="text-sm text-red-400">Upload error: {errorMessage}</p>
      )}
    </div>
  );
}


