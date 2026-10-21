// Connexion par e-mail ou par nom d'utilisateur. Supabase exige une adresse e-mail :
// un nom d'utilisateur devient une adresse interne qui ne reçoit jamais de courrier.
export const DOMAINE_IDENTIFIANT = "identifiant.begnanan-daloa-cup.vercel.app";

const NOM_UTILISATEUR = /^[a-z0-9][a-z0-9._-]{2,29}$/;

/** E-mail de connexion pour une saisie « e-mail ou nom d'utilisateur », ou une erreur lisible. */
export function emailDepuisIdentifiant(saisie: string): { email: string } | { erreur: string } {
  const s = saisie.trim().toLowerCase();
  if (s.includes("@")) {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s) && s.length <= 120 ? { email: s } : { erreur: "Adresse e-mail invalide." };
  }
  return NOM_UTILISATEUR.test(s)
    ? { email: `${s}@${DOMAINE_IDENTIFIANT}` }
    : { erreur: "Nom d'utilisateur : 3 à 30 caractères, lettres sans accents, chiffres, point, tiret ou tiret bas." };
}

/** Ce que la personne a saisi pour se connecter (nom d'utilisateur ou e-mail). */
export const identifiantAffiche = (email: string) =>
  email.endsWith(`@${DOMAINE_IDENTIFIANT}`) ? email.slice(0, -DOMAINE_IDENTIFIANT.length - 1) : email;
