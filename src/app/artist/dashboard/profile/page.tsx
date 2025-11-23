export default function ArtistProfilePage() {
  return (
    <main className="min-h-screen bg-[#0E0E10] text-white px-6 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">
          Artist Profile
        </h1>
        <p className="text-sm text-neutral-400 mb-8">
          Manage your public artist information.
        </p>

        <div className="space-y-8">
          <section className="rounded-xl bg-[#1A1A1A] p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Profile Details</h2>
            <p className="text-sm text-[#B3B3B3]">
              Profile editing features will be added here.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

