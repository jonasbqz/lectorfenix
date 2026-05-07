/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "uploads.mangadex.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**",
        pathname: "/data/**",
      },
    ],
  },
};

export default nextConfig;
