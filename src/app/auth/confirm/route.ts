import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=auth_callback_failed`
    );
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as "magiclink" | "recovery" | "invite" | "email_change",
  });

  if (error) {
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=auth_callback_failed`
    );
  }

  return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
}
