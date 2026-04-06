import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  console.log("[auth/callback] request.url =", request.url);
  console.log("[auth/callback] code exists =", Boolean(code));
  console.log("[auth/callback] code preview =", code ? `${code.slice(0, 8)}...` : null);

  if (!code) {
    console.log("[auth/callback] missing code -> redirect login error");
    return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_callback_failed`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.log("[auth/callback] exchange error =", error.message);
    return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_callback_failed`);
  }

  console.log("[auth/callback] exchange success -> redirect dashboard");
  return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
}
