export default function DashboardHome() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">Dashboard</h1>

      <div className="bg-[#1A1A1C] p-4 rounded-lg">
        <p className="text-[#B3B3B3] text-sm">
          Logged in as:
        </p>
        <p className="text-white font-medium">
          {/* Später dynamisch durch Supabase */}
        </p>
      </div>
    </div>
  );
}

