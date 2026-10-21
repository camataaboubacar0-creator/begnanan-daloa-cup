const TZ = "Africa/Abidjan";

export const fcfa = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;

export const jourCourt = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: TZ });

export const heure = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });

export const dateLongue = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: TZ });

export const dateCourte = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });

export const lienWhatsApp = (texte: string) => `https://wa.me/?text=${encodeURIComponent(texte)}`;

/** Numéro au format international sans « + » (225…), à partir d'une saisie libre (07 00 00 00 00 ou +225…). */
export const numeroInternational = (telephone: string) => {
  const chiffres = telephone.replace(/\D/g, "");
  return telephone.trim().startsWith("+") || chiffres.startsWith("225") ? chiffres : `225${chiffres}`;
};

/** Conversation WhatsApp avec un numéro saisi librement, avec un message prérempli éventuel. */
export const whatsAppNumero = (telephone: string, texte?: string) =>
  `https://wa.me/${numeroInternational(telephone)}${texte ? `?text=${encodeURIComponent(texte)}` : ""}`;

/** Sigle de 2 à 4 lettres tiré du nom d'un club (« Étoiles de Lobia » → « EDL »). */
export function sigleDe(nom: string) {
  const mots = nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
  const initiales = mots.map((m) => m[0]).join("").slice(0, 4);
  return initiales.length >= 2 ? initiales : (mots[0] ?? "CLUB").slice(0, 3).padEnd(2, "X");
}
