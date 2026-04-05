import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { CountryListeners30dRow } from "../types";
import type { CountryStreamsRow } from "./analyticsRows";

export type AudienceTabData = {
  countryListeners30d: CountryListeners30dRow[];
};

export async function getAudienceTabData(args: {
  artistId: string;
}): Promise<AudienceTabData> {
  const { artistId } = args;

  const supabaseAdmin = getSupabaseAdmin();

  const { data: countryRows, error: countryError } = await supabaseAdmin
    .from("artist_country_listeners_30d")
    .select("country_iso2, listeners_30d")
    .eq("artist_id", artistId)
    .order("listeners_30d", { ascending: false })
    .limit(250);

  if (countryError) {
    // intentionally silent: analytics world map errors are non-blocking
  }

  const countryListeners30d: CountryListeners30dRow[] = (countryRows ?? [])
    .map((r) => {
      const row = r as CountryStreamsRow;
      return {
        country_iso2: String(row.country_iso2 ?? "").trim().toUpperCase(),
        listeners_30d: Number(row.listeners_30d ?? 0),
      };
    })
    .filter((r) => r.country_iso2.length === 2 && r.listeners_30d > 0);

  return { countryListeners30d };
}
