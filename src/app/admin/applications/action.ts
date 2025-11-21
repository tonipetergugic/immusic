"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { revalidatePath } from "next/cache";

async function getAdminSupabase() {
  const cookieStore = await cookies(); // <-- NEU: await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: any) {
          cookieStore.set(name, "", { ...options, maxAge: 0 });
        },
      },
    }
  );
}

export async function approveApplication(userId: string, applicationId: string) {
  console.log("SERVER ACTION STARTED — approveApplication", { userId, applicationId });
  const supabase = await getAdminSupabase(); // <-- NEU: await

  await supabase
    .from("profiles")
    .update({ role: "artist" })
    .eq("id", userId);

  await supabase
    .from("artist_applications")
    .update({ status: "approved" })
    .eq("id", applicationId);

  revalidatePath("/admin/applications");
}

export async function rejectApplication(applicationId: string) {
  console.log("SERVER ACTION STARTED — rejectApplication", { applicationId });
  const supabase = await getAdminSupabase(); // <-- NEU: await

  await supabase
    .from("artist_applications")
    .update({ status: "rejected" })
    .eq("id", applicationId);

  revalidatePath("/admin/applications");
}
