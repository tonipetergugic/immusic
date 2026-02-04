"use client";

import { useEffect, useState } from "react";

const FALLBACK_BANNER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
  <svg xmlns='http://www.w3.org/2000/svg' width='1600' height='400'>
  <rect width='100%' height='100%' fill='rgba(255,255,255,0.03)'/>
  </svg>
`);

export default function BannerPreview({
  url,
  posY,
}: {
  url: string | null;
  posY?: number | null;
}) {
  const [src, setSrc] = useState(url ?? FALLBACK_BANNER);
  const bannerPosY =
    typeof posY === "number" && Number.isFinite(posY) ? posY : 50;

  useEffect(() => {
    if (url) {
      // cache-buster only on client
      setSrc(`${url}?t=${Date.now()}`);
    } else {
      setSrc(FALLBACK_BANNER);
    }
  }, [url]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Banner"
      className="h-full w-full object-cover"
      style={{ objectPosition: `50% ${bannerPosY}%` }}
      onError={(e) => {
        e.currentTarget.src = FALLBACK_BANNER;
      }}
    />
  );
}


