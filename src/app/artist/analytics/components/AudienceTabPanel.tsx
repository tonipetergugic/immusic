"use client";

import WorldMapCard from "./WorldMapCard";
import type { CountryListeners30dRow } from "../types";

type Props = {
  countryListeners30d: CountryListeners30dRow[];
};

export default function AudienceTabPanel(props: Props) {
  return (
    <div className="space-y-6">
      {/* Audience should be server-first + minimal: map + real top locations */}
      <WorldMapCard items={props.countryListeners30d} />
    </div>
  );
}
