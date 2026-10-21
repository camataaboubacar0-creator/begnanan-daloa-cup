import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Formulaires avec photos (inscription d'un club et de ses joueurs) : photos réduites à
  // quelques dizaines de Ko sur le téléphone, mais nombreuses.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};

export default nextConfig;
