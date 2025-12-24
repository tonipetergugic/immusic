import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Link
        href="/dashboard/admin/releases"
        className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
      >
        <div className="text-lg font-semibold">Home: Push Releases</div>
        <div className="mt-1 text-sm text-[#B3B3B3]">Open</div>
      </Link>

      <Link
        href="/dashboard/admin/playlists"
        className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
      >
        <div className="text-lg font-semibold">Home: Push Playlists</div>
        <div className="mt-1 text-sm text-[#B3B3B3]">Open</div>
      </Link>

      <Link
        href="/dashboard/admin/credits"
        className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
      >
        <div className="text-lg font-semibold">Credits: Adjust</div>
        <div className="mt-1 text-sm text-[#B3B3B3]">Open</div>
      </Link>

      <Link
        href="/dashboard/admin/moderation"
        className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
      >
        <div className="text-lg font-semibold">Moderation</div>
        <div className="mt-1 text-sm text-[#B3B3B3]">Open</div>
      </Link>
    </div>
  );
}
