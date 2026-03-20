import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminUserDeleteForm from "@/app/dashboard/admin/users/AdminUserDeleteForm";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<{ deleted?: string; error?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const deleted = resolvedSearchParams?.deleted === "1";
  const error = resolvedSearchParams?.error ?? null;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const { data: users, error: usersError } = await supabase
    .from("profiles")
    .select("id, display_name, email, role, created_at")
    .order("created_at", { ascending: false });

  if (usersError) {
    throw new Error(`profiles query failed: ${usersError.message}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Users</h1>
          <p className="mt-1 text-sm text-[#B3B3B3]">
            Manage user accounts and moderation actions.
          </p>
        </div>

        <Link
          href="/dashboard/admin"
          className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-[#B3B3B3] transition hover:bg-white/10 hover:text-white"
        >
          Back
        </Link>
      </div>

      {deleted && (
        <div
          className="rounded-xl border border-[#00FFC6]/20 bg-[#00FFC6]/10 px-4 py-3 text-sm text-[#CFFEF2]"
        >
          User was permanently deleted.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {decodeURIComponent(error)}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-lg font-semibold text-white">User management</div>
        <p className="mt-2 text-sm text-[#B3B3B3]">
          All registered users are listed here. Deletion is permanent and cannot be undone.
        </p>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-[#B3B3B3]">
                <th className="px-3 py-3">Display name</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3">Created</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((item) => (
                <tr key={item.id} className="border-b border-white/5">
                  <td className="px-3 py-3 text-sm text-white">
                    {item.display_name || "—"}
                  </td>
                  <td className="px-3 py-3 text-sm text-[#D1D5DB]">
                    {item.email || "—"}
                  </td>
                  <td className="px-3 py-3 text-sm text-[#D1D5DB]">
                    {item.role || "—"}
                  </td>
                  <td className="px-3 py-3 text-sm text-[#D1D5DB]">
                    {item.created_at
                      ? new Intl.DateTimeFormat("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(item.created_at))
                      : "—"}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {item.id !== user.id ? (
                      <AdminUserDeleteForm
                        action={`/dashboard/admin/users/${item.id}/delete`}
                        displayName={item.display_name || null}
                        email={item.email || null}
                      />
                    ) : (
                      <span className="text-xs text-[#6B7280]">
                        Current admin
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users && users.length === 0 && (
            <div className="py-6 text-sm text-[#B3B3B3]">
              No users found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
