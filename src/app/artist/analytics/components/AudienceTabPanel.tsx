"use client";

import WorldMapCard from "./WorldMapCard";
import type { CountryListeners30dRow } from "../types";

type Props = {
  countryListeners30d: CountryListeners30dRow[];
};

export default function AudienceTabPanel(props: Props) {
  return (
    <section>
      <WorldMapCard items={props.countryListeners30d} />
    </section>
  );
}
