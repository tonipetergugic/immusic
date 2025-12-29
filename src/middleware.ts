import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function getCountryFromHeaders(req: NextRequest): string {
  const h = req.headers;

  // Vercel Geo header
  const vercel = h.get("x-vercel-ip-country");
  // Cloudflare Geo header
  const cf = h.get("cf-ipcountry");

  const raw = (vercel || cf || "").trim().toUpperCase();

  if (/^[A-Z]{2}$/.test(raw)) return raw;
  return "ZZ";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  let res = NextResponse.next();

  const existingCc = req.cookies.get("immusic_cc")?.value;
  const cc = getCountryFromHeaders(req);

  // If we have a real country code, ensure cookie is set.
  // If geo is unknown (ZZ), do NOT set it; and if an old cookie exists, remove it.
  if (cc !== "ZZ") {
    if (existingCc !== cc) {
      res.cookies.set("immusic_cc", cc, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
      });
    }
  } else {
    if (existingCc) {
      res.cookies.set("immusic_cc", "", {
        path: "/",
        maxAge: 0,
        sameSite: "lax",
      });
    }
  }

  // Nur /artist/* schützen
  if (!pathname.startsWith("/artist")) {
    return res;
  }

  // Allowlist: /artist/onboarding ist immer erreichbar (für Listener)
  const isOnboardingIntro = pathname.startsWith("/artist/onboarding");
  if (isOnboardingIntro) {
    return res;
  }

  // Supabase SSR client im Middleware-Kontext

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
    const redirectRes = NextResponse.redirect(url);
    const cc = getCountryFromHeaders(req);
    if (cc !== "ZZ") {
      redirectRes.cookies.set("immusic_cc", cc, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
      });
    } else {
      const existingCc = req.cookies.get("immusic_cc")?.value;
      if (existingCc) {
        redirectRes.cookies.set("immusic_cc", "", {
          path: "/",
          maxAge: 0,
          sameSite: "lax",
        });
      }
    }
    return redirectRes;
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
    const redirectRes = NextResponse.redirect(url);
    const cc = getCountryFromHeaders(req);
    if (cc !== "ZZ") {
      redirectRes.cookies.set("immusic_cc", cc, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
      });
    } else {
      const existingCc = req.cookies.get("immusic_cc")?.value;
      if (existingCc) {
        redirectRes.cookies.set("immusic_cc", "", {
          path: "/",
          maxAge: 0,
          sameSite: "lax",
        });
      }
    }
    return redirectRes;
  }

  // Alle anderen /artist/* Seiten: nur Artist
  if (!isArtist) {
    const url = req.nextUrl.clone();
    url.pathname = "/artist/onboarding";
    const redirectRes = NextResponse.redirect(url);
    const cc = getCountryFromHeaders(req);
    if (cc !== "ZZ") {
      redirectRes.cookies.set("immusic_cc", cc, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
      });
    } else {
      const existingCc = req.cookies.get("immusic_cc")?.value;
      if (existingCc) {
        redirectRes.cookies.set("immusic_cc", "", {
          path: "/",
          maxAge: 0,
          sameSite: "lax",
        });
      }
    }
    return redirectRes;
  }

  return res;
}

export const config = {
  matcher: ["/artist/:path*"],
};

