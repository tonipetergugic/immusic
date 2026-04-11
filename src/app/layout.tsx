import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import GlobalPlayerWrapper from "@/components/GlobalPlayerWrapper";
import "./globals.css";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ImMusic",
  description: "ImMusic – fair music discovery for artists and listeners.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialHideExplicitTracks = false;

  if (user?.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("hide_explicit_tracks")
      .eq("id", user.id)
      .maybeSingle();

    initialHideExplicitTracks = !!profile?.hide_explicit_tracks;
  }

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-[#0E0E10] text-white antialiased overflow-hidden`}
      >
        <GlobalPlayerWrapper initialHideExplicitTracks={initialHideExplicitTracks}>
          {children}
        </GlobalPlayerWrapper>
      </body>
    </html>
  );
}
