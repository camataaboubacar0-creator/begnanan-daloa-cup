import "server-only";
import { headers } from "next/headers";

/**
 * Adresse publique du site, pour les liens des QR codes. On vise toujours l'adresse de production :
 * un QR code imprimé depuis une adresse de prévisualisation Vercel (protégée par connexion) ne
 * s'ouvrirait pas sur le téléphone du contrôleur.
 */
export async function adresseDuSite() {
  const fixe = process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  if (fixe) return fixe.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}
