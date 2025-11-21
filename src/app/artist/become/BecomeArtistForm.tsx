"use client";

import { useState, useTransition } from "react";
import { submitArtistApplication } from "./action";

export function BecomeArtistForm({ userId }: { userId: string }) {
  const [artistName, setArtistName] = useState("");
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");
  const [genre, setGenre] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(() =>
          submitArtistApplication({
            user_id: userId,
            artist_name: artistName,
            full_name: fullName,
            country,
            genre,
          })
        );
      }}
    >
      <input
        required
        placeholder="Artist Name"
        className="p-3 rounded bg-[#111] border border-[#222] text-white"
        value={artistName}
        onChange={(e) => setArtistName(e.target.value)}
      />

      <input
        required
        placeholder="Full Name"
        className="p-3 rounded bg-[#111] border border-[#222] text-white"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
      />

      <input
        required
        placeholder="Country"
        className="p-3 rounded bg-[#111] border border-[#222] text-white"
        value={country}
        onChange={(e) => setCountry(e.target.value)}
      />

      <input
        required
        placeholder="Genre"
        className="p-3 rounded bg-[#111] border border-[#222] text-white"
        value={genre}
        onChange={(e) => setGenre(e.target.value)}
      />

      <button
        type="submit"
        className="mt-4 py-3 bg-[#00FFC6] hover:bg-[#00E0B0] rounded text-black font-semibold transition"
      >
        {isPending ? "Submitting..." : "Submit Application"}
      </button>
    </form>
  );
}
