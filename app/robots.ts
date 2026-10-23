import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "begnanan-daloa-cup.vercel.app"}`;

// Les espaces de connexion et les pages de vérification de cartes restent hors de Google.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/espace-club", "/licence"] },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
