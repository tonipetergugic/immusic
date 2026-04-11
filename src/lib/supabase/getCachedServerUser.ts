import { cache } from "react";
import { createSupabaseServerClient } from "./server";

export const getCachedServerUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) return null;
  return data.user ?? null;
});
