import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const formData = await request.formData();
  const confirm = formData.get("confirm");

  if (confirm !== "DELETE") {
    return NextResponse.redirect(
      new URL(
        "/dashboard/admin/users?error=Invalid%20delete%20confirmation",
        request.url
      )
    );
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (id === user.id) {
    return NextResponse.redirect(
      new URL(
        "/dashboard/admin/users?error=You%20cannot%20delete%20your%20own%20admin%20account%20here",
        request.url
      )
    );
  }

  const { error } = await supabase.rpc("admin_delete_user", {
    target_user_id: id,
  });

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/dashboard/admin/users?error=${encodeURIComponent(
          `admin_delete_user failed: ${error.message}`
        )}`,
        request.url
      )
    );
  }

  return NextResponse.redirect(
    new URL("/dashboard/admin/users?deleted=1", request.url)
  );
}
