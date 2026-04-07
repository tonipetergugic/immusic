import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ImMusic",
    short_name: "ImMusic",
    description: "ImMusic – fair music discovery for artists and listeners.",
    start_url: "/",
    display: "standalone",
    background_color: "#0E0E10",
    theme_color: "#0E0E10",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
