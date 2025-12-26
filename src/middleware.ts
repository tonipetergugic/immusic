import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Nur /artist/* schützen
  if (!pathname.startsWith("/artist")) {
    return NextResponse.next();
  }

  // Allowlist: /artist/onboarding ist immer erreichbar (für Listener)
  const isOnboardingIntro = pathname.startsWith("/artist/onboarding");
  if (isOnboardingIntro) {
    return NextResponse.next();
  }

  // Supabase SSR client im Middleware-Kontext
  let res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Hole role + onboarding-status (RLS muss select own profile erlauben)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, artist_onboarding_status")
    .eq("id", user.id)
    .single();

  const role = profile?.role;
  const onboarding = profile?.artist_onboarding_status;

  const isArtist = role === "artist";
  const isUpload = pathname.startsWith("/artist/upload");
  const isPendingUpload = onboarding === "pending_upload";

  // Upload ist nur erlaubt für Artist ODER pending_upload
  if (isUpload) {
    if (isArtist || isPendingUpload) return res;

    const url = req.nextUrl.clone();
    url.pathname = "/artist/onboarding";
    return NextResponse.redirect(url);
  }

  // Alle anderen /artist/* Seiten: nur Artist
  if (!isArtist) {
    const url = req.nextUrl.clone();
    url.pathname = "/artist/onboarding";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/artist/:path*"],
};

