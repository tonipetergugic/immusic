import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Upload, MessageCircleMore, Compass } from "lucide-react";
import { getUser } from "@/lib/supabase/getUser";

export default async function HomePage() {
  const user = await getUser();

  // Wenn eingeloggt → Dashboard
  if (user) {
    redirect("/dashboard");
  }

  // Wenn nicht eingeloggt → minimale Landingpage (mobile-first)
  return (
    <main className="relative min-h-full overflow-x-hidden">
      {/* Background image layer */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/landing/hero-bg.png)" }}
        aria-hidden="true"
      />

      {/* Dark overlay for readability */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/70 to-black/85"
        aria-hidden="true"
      />

      {/* Subtle brand glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(800px 400px at 50% 30%, rgba(0,255,198,0.18), transparent 60%)",
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
          <div className="flex flex-col items-center">
            <div className="mb-6 flex items-center justify-center">
              <Image
                src="/brand/logo.png"
                alt="ImMusic"
                width={120}
                height={120}
                priority
                className="shadow-2xl shadow-black/40"
              />
            </div>
            <h1 className="mt-6 text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Discover music<br />
              Get <span className="text-[#00FFC6]">real feedback</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70 sm:text-xl">
              Discover tracks, rate quality, and improve your music with real feedback.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4">
              <Link
                href="/login"
                className="inline-flex h-16 min-w-[220px] items-center justify-center rounded-full border border-[#00FFC6]/40 bg-black/40 px-12 text-lg font-semibold tracking-tight text-white backdrop-blur-md transition hover:border-[#00FFC6] hover:bg-black/55 hover:shadow-[0_0_25px_rgba(0,255,198,0.25)] focus:outline-none focus:ring-2 focus:ring-[#00FFC6]/40"
              >
                Get <span className="ml-1 text-[#00FFC6]">started</span>
              </Link>

            </div>
          </div>

          <div className="mt-12 grid w-full gap-6 text-left sm:grid-cols-3">
            <div className="relative rounded-[22px] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-xl">
              <div
                className="pointer-events-none absolute inset-0 rounded-[22px]"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 22%, rgba(255,255,255,0.02) 100%)",
                }}
                aria-hidden="true"
              />
              <div className="relative">
                <p className="text-[20px] font-semibold tracking-tight text-[#00FFC6]">
                  Real listeners
                </p>
                <p className="mt-3 text-[16px] leading-7 text-white/72">
                  No bots. Every play and rating comes from real people.
                </p>
              </div>
            </div>

            <div className="relative rounded-[22px] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-xl">
              <div
                className="pointer-events-none absolute inset-0 rounded-[22px]"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 22%, rgba(255,255,255,0.02) 100%)",
                }}
                aria-hidden="true"
              />
              <div className="relative">
                <p className="text-[20px] font-semibold tracking-tight text-[#00FFC6]">
                  Fair discovery
                </p>
                <p className="mt-3 text-[16px] leading-7 text-white/72">
                  Tracks compete on quality, not manipulation.
                </p>
              </div>
            </div>

            <div className="relative rounded-[22px] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-xl">
              <div
                className="pointer-events-none absolute inset-0 rounded-[22px]"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 22%, rgba(255,255,255,0.02) 100%)",
                }}
                aria-hidden="true"
              />
              <div className="relative">
                <p className="text-[20px] font-semibold tracking-tight text-[#00FFC6]">
                  Real feedback
                </p>
                <p className="mt-3 text-[16px] leading-7 text-white/72">
                  Ratings and insights that help artists improve.
                </p>
              </div>
            </div>
          </div>

          <section className="mt-16 w-full max-w-4xl">
            <div className="text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                How <span className="text-[#00FFC6]">ImMusic</span> works
              </h2>
              <p className="mt-4 text-base leading-7 text-white/65 sm:text-lg">
                A simple flow for artists and listeners.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="relative rounded-[22px] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-xl">
                <div
                  className="pointer-events-none absolute inset-0 rounded-[22px]"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 22%, rgba(255,255,255,0.02) 100%)",
                  }}
                  aria-hidden="true"
                />
                <div className="relative">
                  <div className="flex items-center gap-3">
                    <Upload className="h-5 w-5 text-white" />
                    <h3 className="text-[20px] font-semibold tracking-tight text-[#00FFC6]">
                      Upload music
                    </h3>
                  </div>

                  <p className="mt-3 text-[16px] leading-7 text-white/72">
                    Share your track and enter a quality-focused platform.
                  </p>
                </div>
              </div>

              <div className="relative rounded-[22px] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-xl">
                <div
                  className="pointer-events-none absolute inset-0 rounded-[22px]"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 22%, rgba(255,255,255,0.02) 100%)",
                  }}
                  aria-hidden="true"
                />
                <div className="relative">
                  <div className="flex items-center gap-3">
                    <MessageCircleMore className="h-5 w-5 text-white" />
                    <h3 className="text-[20px] font-semibold tracking-tight text-[#00FFC6]">
                      Get feedback
                    </h3>
                  </div>

                  <p className="mt-3 text-[16px] leading-7 text-white/72">
                    Receive real ratings and insights that help you improve.
                  </p>
                </div>
              </div>

              <div className="relative rounded-[22px] border border-white/12 bg-white/[0.04] p-6 backdrop-blur-xl">
                <div
                  className="pointer-events-none absolute inset-0 rounded-[22px]"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 22%, rgba(255,255,255,0.02) 100%)",
                  }}
                  aria-hidden="true"
                />
                <div className="relative">
                  <div className="flex items-center gap-3">
                    <Compass className="h-5 w-5 text-white" />
                    <h3 className="text-[20px] font-semibold tracking-tight text-[#00FFC6]">
                      Discover quality
                    </h3>
                  </div>

                  <p className="mt-3 text-[16px] leading-7 text-white/72">
                    Explore music shaped by real listening instead of bots.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-16 w-full max-w-4xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Start as a <span className="text-[#00FFC6]">listener</span>. Become an <span className="text-[#00FFC6]">artist</span> anytime.
            </h2>

            <p className="mt-4 text-base leading-7 text-white/65 sm:text-lg">
              Create one account to explore music and rate tracks. If you want to share
              your own music, simply open the dashboard and choose
              <span className="text-[#00FFC6]">"Become an artist"</span>
              in the sidebar.
            </p>

          </section>
        </div>
      </div>
    </main>
  );
}
