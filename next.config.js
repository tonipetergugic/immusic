/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone", // required for future deployment (Railway, Docker, Cloud Run)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "qlqwfgynjcnkxtqxzmdf.supabase.co",
        port: "",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
  experimental: {
    optimizeCss: true,
  },
};

module.exports = nextConfig;
