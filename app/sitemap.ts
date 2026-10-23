import type { MetadataRoute } from "next";
import { getClubs, getPublications } from "@/lib/data";

// Plan du site pour Google : pages publiques, fiches des clubs et publications.
export const revalidate = 3600;

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "begnanan-daloa-cup.vercel.app"}`;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [clubs, publications] = await Promise.all([getClubs(), getPublications()]);
  const pages = ["", "/matchs", "/classements", "/equipes", "/billetterie", "/medias", "/infos", "/inscription-club"];
  return [
    ...pages.map((p) => ({ url: `${SITE}${p}`, changeFrequency: "daily" as const, priority: p ? 0.8 : 1 })),
    ...clubs.map((c) => ({ url: `${SITE}/equipes/${c.id}`, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...publications.map((p) => ({ url: `${SITE}/medias/${p.id}`, lastModified: p.publiee_le ?? undefined, priority: 0.5 })),
  ];
}
