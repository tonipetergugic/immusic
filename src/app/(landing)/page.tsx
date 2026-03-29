import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import {
  MicVocal,
  MessageCircleMore,
  Compass,
  User,
  Search,
  Star,
  type LucideIcon,
} from "lucide-react";
import { getUser } from "@/lib/supabase/getUser";

function LandingCard({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="relative rounded-[22px] border border-white/10 bg-white/[0.025] p-6 backdrop-blur-2xl">
      <div
        className="pointer-events-none absolute inset-0 rounded-[22px]"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.035) 22%, rgba(255,255,255,0.012) 100%)",
        }}
        aria-hidden="true"
      />
      <div className="relative">
        {Icon ? (
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-white" />
            <h3 className="text-[20px] font-semibold tracking-tight text-[#00FFC6]">
              {title}
            </h3>
          </div>
        ) : (
          <p className="text-[20px] font-semibold tracking-tight text-[#00FFC6]">
            {title}
          </p>
        )}

        <p className="mt-3 text-[16px] leading-7 text-white/72">
          {description}
        </p>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const user = await getUser();

  // Wenn eingeloggt → Dashboard
  if (user) {
    redirect("/dashboard");
  }

  // Wenn nicht eingeloggt → Landingpage
  return (
    <main className="relative min-h-[calc(100dvh-6rem)] overflow-x-hidden">
      {/* Background image layer */}
      <div
        className="absolute inset-0 bg-center bg-cover xl:bg-[length:100%_auto] xl:bg-top xl:bg-no-repeat"
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
      <div className="relative px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
          <div className="flex flex-col items-center">
            <div className="mb-5 flex items-center justify-center sm:mb-6">
              <Image
                src="/brand/logo.png"
                alt="ImMusic"
                width={120}
                height={120}
                priority
                className="shadow-2xl shadow-black/40"
              />
            </div>
            <h1 className="mt-4 text-5xl font-semibold tracking-tight text-white sm:mt-5 sm:text-6xl lg:text-7xl">
              Real <span className="text-[#00FFC6]">listeners</span>. Real <span className="text-[#00FFC6]">feedback</span>.
              <br />
              Fair <span className="text-[#00FFC6]">discovery</span>.
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-white/70 sm:text-lg sm:leading-8">
              Discover music through real people and help artists grow with honest ratings instead of fake attention and vanity metrics.
            </p>

            <div className="mt-8 flex items-center justify-center sm:mt-10">
              <Link
                href="/login"
                className="inline-flex h-16 min-w-[220px] items-center justify-center rounded-full border border-[#00FFC6]/40 bg-black/40 px-12 text-lg font-semibold tracking-tight text-white backdrop-blur-md transition hover:border-[#00FFC6] hover:bg-black/55 hover:shadow-[0_0_25px_rgba(0,255,198,0.25)] focus:outline-none focus:ring-2 focus:ring-[#00FFC6]/40"
              >
                Get <span className="ml-1 text-[#00FFC6]">started</span>
              </Link>
            </div>
          </div>

          <div className="mt-14 grid w-full gap-6 text-left sm:mt-16 sm:grid-cols-3">
            <LandingCard
              icon={User}
              title="Real listeners"
              description="No bots. Every play and rating comes from real people."
            />

            <LandingCard
              icon={MessageCircleMore}
              title="Real feedback"
              description="Honest ratings and insights that help artists improve."
            />

            <LandingCard
              icon={Search}
              title="Fair discovery"
              description="Quality stands out through real listening, not manipulation."
            />
          </div>

          <section className="mt-20 w-full max-w-4xl">
            <div className="text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                How <span className="text-[#00FFC6]">ImMusic</span> works
              </h2>
              <p className="mt-4 text-base leading-7 text-white/65 sm:text-lg">
                A simple listener-first flow with a path to become an artist.
              </p>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-3">
              <LandingCard
                icon={Compass}
                title="Discover quality"
                description="Explore music shaped by real listening instead of bots."
              />

              <LandingCard
                icon={Star}
                title="Rate honestly"
                description="Give real ratings and feedback that help artists improve."
              />

              <LandingCard
                icon={MicVocal}
                title="Become an artist"
                description="Join as an artist and share your music."
              />
            </div>
          </section>

          <section className="mt-20 w-full max-w-4xl text-center sm:mt-24">
            <h2 className="mx-auto max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Start as a <span className="text-[#00FFC6]">listener</span>. Become an <span className="text-[#00FFC6]">artist</span> anytime.
            </h2>

            <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-white/68 sm:text-lg">
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
