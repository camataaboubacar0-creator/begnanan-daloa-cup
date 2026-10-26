import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// Les espaces de connexion et les pages de vérification de cartes restent hors de Google.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/espace-club", "/licence"] },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
