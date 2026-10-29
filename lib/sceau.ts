import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Sceau des QR codes : seules les cartes imprimées par l'organisation portent un QR code signé
 * avec la clé secrète du site. Un QR code fabriqué à partir du seul numéro de carte n'est pas valide.
 */
function cle() {
  const secret = process.env.CARTES_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Clé de signature des cartes absente");
  return secret;
}

export function sceauCarte(numero: string) {
  return createHmac("sha256", cle()).update(`carte:${numero.toUpperCase()}`).digest("base64url").slice(0, 16);
}

export function sceauValide(numero: string, sceau?: string | null) {
  if (!sceau) return false;
  try {
    const attendu = Buffer.from(sceauCarte(numero));
    const recu = Buffer.from(sceau);
    return attendu.length === recu.length && timingSafeEqual(attendu, recu);
  } catch {
    return false;
  }
}
