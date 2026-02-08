import BackLink from "@/components/BackLink";

export default function UploadFeedbackPage() {
  return (
    <div className="min-h-screen bg-[#0E0E10] text-white">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <BackLink href="/artist/upload/processing" label="Back" />

        <h1 className="text-2xl font-bold mt-6">Detaillierte KI-Auswertung</h1>
        <p className="text-white/70 mt-2">
          Diese Funktion ist noch nicht verfügbar.
        </p>

        <div className="mt-6 rounded-xl bg-[#111112] p-5">
          <p className="text-white/80">
            Kosten: <span className="font-semibold text-white">1 Credit</span>
          </p>
          <p className="text-white/60 mt-2">
            Hinweis: Ohne bezahltes Feedback zeigen wir keine Details, Messwerte oder Gründe an.
          </p>
        </div>
      </div>
    </div>
  );
}
