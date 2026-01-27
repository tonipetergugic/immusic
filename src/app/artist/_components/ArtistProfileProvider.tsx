"use client";

import React, { createContext, useContext } from "react";

type ArtistProfileValue = {
  displayName: string | null;
  bannerUrl: string | null;
  artistOnboardingStatus: string | null;
};

const ArtistProfileContext = createContext<ArtistProfileValue | null>(null);

export function ArtistProfileProvider({
  value,
  children,
}: {
  value: ArtistProfileValue;
  children: React.ReactNode;
}) {
  return (
    <ArtistProfileContext.Provider value={value}>
      {children}
    </ArtistProfileContext.Provider>
  );
}

export function useArtistProfile() {
  const ctx = useContext(ArtistProfileContext);
  if (!ctx) {
    throw new Error("useArtistProfile must be used within ArtistProfileProvider");
  }
  return ctx;
}
