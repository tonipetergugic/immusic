import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function uploadToStorage(
  bucket: string,
  filePath: string,
  file: File
) {
  const supabase = createSupabaseBrowserClient();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error(error);
    throw new Error(`Failed to upload file to ${bucket}`);
  }

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  if (!data || !data.publicUrl) {
    throw new Error("Failed to generate public URL");
  }

  return data.publicUrl;
}
