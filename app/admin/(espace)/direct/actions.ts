"use server";

import { ecrire, entier, texte, type Etat } from "@/lib/admin";
import { exigerAcces } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Saisie en direct. Le score du match est recalculé par la base à chaque but ajouté ou retiré.

const TYPES = ["but", "csc", "jaune", "rouge"];

export async function ajouterEvenement(_: Etat, f: FormData): Promise<Etat> {
  await exigerAcces("direct");
  const type = texte(f, "type");
  const matchId = texte(f, "match_id");
  const equipe = texte(f, "club_id");
  const joueurId = texte(f, "joueur_id") || null;
  const minute = entier(f, "minute");
  if (!TYPES.includes(type)) return { erreur: "Choisissez but, but contre son camp ou carton." };
  if (minute !== null && (Number.isNaN(minute) || minute < 0 || minute > 130)) return { erreur: "Minute invalide." };

  const db = await createClient();
  const [{ data: m }, { data: j }] = await Promise.all([
    db.from("matchs").select("club_domicile, club_exterieur").eq("id", matchId).single(),
    joueurId ? db.from("joueurs").select("nom, prenoms").eq("id", joueurId).single() : Promise.resolve({ data: null }),
  ]);
  if (!m) return { erreur: "Match introuvable." };
  // Un but contre son camp est compté à l'adversaire de l'équipe du joueur.
  const club = type === "csc" ? (equipe === m.club_domicile ? m.club_exterieur : m.club_domicile) : equipe;
  const libelle = { but: "But", csc: "But contre son camp", jaune: "Carton jaune", rouge: "Carton rouge" }[type];
  return ecrire(
    "direct",
    (d) => d.from("evenements_match").insert({ match_id: matchId, club_id: club, type, joueur_id: joueurId, joueur_nom: j ? `${j.prenoms} ${j.nom}` : null, minute }),
    `${libelle} enregistré${type === "but" || type === "csc" ? " : score mis à jour" : ""}.`,
  );
}

export async function retirerEvenement(_: Etat, f: FormData): Promise<Etat> {
  return ecrire("direct", (db) => db.from("evenements_match").delete().eq("id", texte(f, "id")), "Retiré : score mis à jour.");
}

/** Coup d'envoi et fin du match. La validation du résultat reste dans « Clubs et matchs ». */
export async function changerStatut(_: Etat, f: FormData): Promise<Etat> {
  await exigerAcces("direct");
  const statut = texte(f, "statut");
  const id = texte(f, "match_id");
  if (statut !== "en cours" && statut !== "terminé") return { erreur: "Statut invalide." };
  // Coup d'envoi : le score part de 0-0 ; un match terminé sans but reste à 0-0.
  const { data: m } = await (await createClient()).from("matchs").select("buts_domicile, buts_exterieur").eq("id", id).single();
  const maj = { statut, buts_domicile: m?.buts_domicile ?? 0, buts_exterieur: m?.buts_exterieur ?? 0, modifie_le: new Date().toISOString() };
  return ecrire(
    "direct",
    (db) => db.from("matchs").update(maj).eq("id", id),
    statut === "en cours" ? "Match lancé : il apparaît « en cours » sur le site." : "Match terminé. Validez le résultat dans « Clubs et matchs ».",
  );
}
