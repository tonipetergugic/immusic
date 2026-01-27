// NACHHER:
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ArtistUploadClient from "./_components/ArtistUploadClient";

export default async function ArtistUploadPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <ArtistUploadClient userId={user.id} />;
}
