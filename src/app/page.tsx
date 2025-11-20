import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/getUser";

export default async function HomePage() {
  const user = await getUser();

  // Wenn nicht eingeloggt → Login
  if (!user) {
    redirect("/login");
  }

  // Wenn eingeloggt → Dashboard
  redirect("/dashboard");
}
