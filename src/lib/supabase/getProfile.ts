import { createSupabaseServerClient } from "./server";
import { getUser } from "./getUser";

export async function getProfile() {
  const supabase = await createSupabaseServerClient();
  const user = await getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data;
}
