/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone", // required for future deployment (Railway, Docker, Cloud Run)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placeholder.co",
      },
      {
        protocol: "https",
        hostname: "dummyimage.com",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co", // allow Supabase Storage images
      },
    ],
  },
  experimental: {
    optimizeCss: true,
  },
};

module.exports = nextConfig;
