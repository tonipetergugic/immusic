"use client";

import { useEffect, useState } from "react";

export default function BannerPreview({ url }: { url: string | null }) {
  const [src, setSrc] = useState(url ?? "/default-banner.jpg");

  useEffect(() => {
    if (url) {
      // cache-buster only on client
      setSrc(`${url}?t=${Date.now()}`);
    }
  }, [url]);

  return (
    <img
      src={src}
      onError={(e) => {
        e.currentTarget.src = "/default-banner.jpg";
      }}
      className="w-full h-32 object-cover rounded-lg"
    />
  );
}


