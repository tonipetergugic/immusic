import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import AdminBackButton from "./AdminBackButton";
import AppShell from "@/components/layout/AppShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) redirect("/dashboard");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") redirect("/dashboard");

  return (
    <AppShell
      mainClassName="flex-1 overflow-y-auto overflow-x-hidden"
      innerClassName="w-full max-w-[1600px] mx-auto px-3 pt-6 pb-40 sm:px-4 sm:pt-8 lg:px-6 lg:pb-48"
    >
      <div className="w-full pb-24">
        <div className="flex flex-col gap-2">
          <AdminBackButton />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>

            <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <Link
                href="/dashboard/admin/releases"
                className="text-[#B3B3B3] hover:text-[#00FFC6] transition-colors"
              >
                Releases
              </Link>
              <Link
                href="/dashboard/admin/playlists"
                className="text-[#B3B3B3] hover:text-[#00FFC6] transition-colors"
              >
                Playlists
              </Link>
              <Link
                href="/dashboard/admin/credits"
                className="text-[#B3B3B3] hover:text-[#00FFC6] transition-colors"
              >
                Credits
              </Link>
              <Link
                href="/dashboard/admin/moderation"
                className="text-[#B3B3B3] hover:text-[#00FFC6] transition-colors"
              >
                Moderation
              </Link>
            </nav>
          </div>
        </div>

        <div className="mt-6">{children}</div>
      </div>
    </AppShell>
  );
}

