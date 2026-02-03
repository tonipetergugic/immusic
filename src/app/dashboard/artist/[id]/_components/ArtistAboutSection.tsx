"use client";

import type { ArtistCoreDto } from "../_types/artistPageDto";

export default function ArtistAboutSection({
  artist,
}: {
  artist: ArtistCoreDto;
}) {
  const hasSocial =
    !!artist.socials.instagram ||
    !!artist.socials.tiktok ||
    !!artist.socials.facebook ||
    !!artist.socials.x;

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">About</h2>

      {artist.bio ? (
        <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-200">
          {artist.bio}
        </p>
      ) : (
        <p className="mt-3 text-sm text-neutral-400">No bio yet.</p>
      )}

      {artist.city || artist.country ? (
        <p className="mt-3 text-sm text-neutral-400">
          Location: {[artist.city, artist.country].filter(Boolean).join(", ")}
        </p>
      ) : null}

      {hasSocial ? (
        <div className="mt-3 text-sm text-neutral-300">
          <div className="text-neutral-400">Social</div>
          <ul className="mt-2 space-y-1">
            {artist.socials.instagram ? (
              <li>
                <a
                  className="underline underline-offset-2"
                  href={artist.socials.instagram}
                  target="_blank"
                  rel="noreferrer"
                >
                  Instagram
                </a>
              </li>
            ) : null}
            {artist.socials.tiktok ? (
              <li>
                <a
                  className="underline underline-offset-2"
                  href={artist.socials.tiktok}
                  target="_blank"
                  rel="noreferrer"
                >
                  TikTok
                </a>
              </li>
            ) : null}
            {artist.socials.facebook ? (
              <li>
                <a
                  className="underline underline-offset-2"
                  href={artist.socials.facebook}
                  target="_blank"
                  rel="noreferrer"
                >
                  Facebook
                </a>
              </li>
            ) : null}
            {artist.socials.x ? (
              <li>
                <a
                  className="underline underline-offset-2"
                  href={artist.socials.x}
                  target="_blank"
                  rel="noreferrer"
                >
                  X
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
