import "server-only";
import { headers } from "next/headers";

/** Adresse du site telle que le visiteur l'a ouverte (pour les liens des QR codes). */
export async function adresseDuSite() {
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}
