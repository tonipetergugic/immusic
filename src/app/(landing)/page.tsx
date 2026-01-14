import Link from "next/link";
import { redirect } from "next/navigation";
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
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="rounded-full border border-white/10 bg-black/30 px-4 py-1 text-xs text-white/60 backdrop-blur">
              Early access
            </div>

            <h1 className="mt-6 text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
              <span>Im</span>
              <span className="text-[#00FFC6]">Music</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70 sm:text-xl">
              A bot-free, quality-controlled platform for artists and listeners — built for
              real feedback and fair discovery.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4">
              <Link
                href="/login"
                className="group inline-flex h-12 items-center justify-center rounded-full border border-white/15 bg-black/30 px-9 text-sm font-semibold text-white backdrop-blur-md shadow-lg shadow-black/30 transition hover:border-[#00FFC6]/40 hover:bg-black/35 hover:shadow-[#00FFC6]/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#00FFC6]/40"
              >
                <span className="tracking-tight">
                  Sign <span className="text-[#00FFC6]">in</span>
                </span>
              </Link>

              <p className="text-sm text-white/50">
                No ads. No bots. No noise.
              </p>
            </div>
          </div>

          <div className="mt-16 grid w-full gap-6 text-left sm:grid-cols-3">
            <div className="group relative overflow-hidden rounded-2xl border border-white/15 bg-black/20 p-5 backdrop-blur-2xl shadow-2xl shadow-black/50">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/22 via-white/8 to-transparent" aria-hidden="true" />
              <div className="pointer-events-none absolute -top-20 left-8 h-40 w-64 rotate-[-12deg] rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: "radial-gradient(500px 200px at 50% 0%, rgba(0,255,198,0.18), transparent 60%)" }}
                aria-hidden="true"
              />
              <div className="relative">
                <p className="text-sm font-medium text-white">Bot-free by design</p>
                <p className="mt-1 text-sm text-white/60">
                  Real people, real listening, real ratings.
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-white/15 bg-black/20 p-5 backdrop-blur-2xl shadow-2xl shadow-black/50">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/22 via-white/8 to-transparent" aria-hidden="true" />
              <div className="pointer-events-none absolute -top-20 left-8 h-40 w-64 rotate-[-12deg] rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: "radial-gradient(500px 200px at 50% 0%, rgba(0,255,198,0.18), transparent 60%)" }}
                aria-hidden="true"
              />
              <div className="relative">
                <p className="text-sm font-medium text-white">Fair discovery</p>
                <p className="mt-1 text-sm text-white/60">
                  Visibility without manipulation or pay-to-win.
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-white/15 bg-black/20 p-5 backdrop-blur-2xl shadow-2xl shadow-black/50">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/22 via-white/8 to-transparent" aria-hidden="true" />
              <div className="pointer-events-none absolute -top-20 left-8 h-40 w-64 rotate-[-12deg] rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: "radial-gradient(500px 200px at 50% 0%, rgba(0,255,198,0.18), transparent 60%)" }}
                aria-hidden="true"
              />
              <div className="relative">
                <p className="text-sm font-medium text-white">Built for learning</p>
                <p className="mt-1 text-sm text-white/60">
                  Feedback loops that help artists improve.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
