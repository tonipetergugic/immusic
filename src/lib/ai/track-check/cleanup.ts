export async function bestEffortRemoveIngestWav(params: {
  supabase: any;
  audioPath: string | null;
}) {
  try {
    if (params.audioPath) {
      await params.supabase.storage.from("ingest_wavs").remove([params.audioPath]);
    }
  } catch {}
}
