"use server";

import { coche, ecrire, entier, texte, type Etat } from "@/lib/admin";
import { exigerAcces } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

// Toutes les règles du mercato sont appliquées par la base (fonctions demander/répondre/valider_transfert).

export async function ouvrirMercato(_: Etat, f: FormData): Promise<Etat> {
  const ouvert = coche(f, "mercato_ouvert");
  return ecrire("mercato", (db) => db.from("tournoi").update({ mercato_ouvert: ouvert }).eq("id", 1), ouvert ? "Mercato ouvert." : "Mercato fermé.");
}

export async function disqualifierClub(_: Etat, f: FormData): Promise<Etat> {
  const oui = coche(f, "disqualifie");
  return ecrire("mercato", (db) => db.from("clubs").update({ disqualifie: oui }).eq("id", texte(f, "id")), oui ? "Club disqualifié." : "Club réintégré.");
}

/**
 * Retrouve le numéro de licence à partir d'un numéro (BDC-…) ou du nom du joueur. Les présidents ne
 * voient pas les joueurs des autres clubs : la recherche par nom passe par le serveur et ne renvoie
 * que des joueurs licenciés d'autres clubs (nom, club et numéro, déjà visibles sur leurs cartes).
 */
async function numeroDuJoueur(saisie: string, monClub?: string): Promise<{ numero: string } | { erreur: string }> {
  if (/^BDC-/i.test(saisie)) return { numero: saisie.toUpperCase().replace(/\s+/g, "") };
  const mots = saisie.replace(/[,()%*\\.]/g, " ").split(/\s+/).filter((m) => m.length >= 2).slice(0, 4);
  if (!mots.length) return { erreur: "Indiquez le numéro de licence ou le nom du joueur." };
  let requete = createServiceClient().from("joueurs").select("numero_licence, nom, prenoms, club_id, clubs(nom)").eq("etat", "active").not("numero_licence", "is", null);
  if (monClub) requete = requete.neq("club_id", monClub);
  for (const m of mots) requete = requete.or(`nom.ilike.%${m}%,prenoms.ilike.%${m}%`);
  const { data, error } = await requete.limit(6);
  if (error) {
    console.error(error);
    return { erreur: "Recherche impossible pour le moment. Indiquez le numéro de licence." };
  }
  if (!data?.length) return { erreur: `Aucun joueur licencié ne correspond à « ${saisie} ».` };
  if (data.length > 1) {
    const club = (c: unknown) => (Array.isArray(c) ? c[0]?.nom : (c as { nom?: string } | null)?.nom) ?? "";
    const liste = data.map((j) => `${j.prenoms} ${j.nom} (${club(j.clubs)}, ${j.numero_licence})`).join(" ; ");
    return { erreur: `Plusieurs joueurs correspondent : ${liste}. Précisez le nom ou indiquez le numéro de licence.` };
  }
  return { numero: data[0].numero_licence! };
}

export async function demanderTransfert(_: Etat, f: FormData): Promise<Etat> {
  const orga = await exigerAcces("mercato");
  const saisie = texte(f, "numero").slice(0, 80);
  const montant = entier(f, "montant");
  if (!saisie) return { erreur: "Indiquez le numéro de licence ou le nom du joueur." };
  if (montant !== null && (Number.isNaN(montant) || montant < 0)) return { erreur: "Montant invalide." };
  const joueur = await numeroDuJoueur(saisie, orga.club_id);
  if ("erreur" in joueur) return joueur;
  return ecrire("mercato", (db) => db.rpc("demander_transfert", { p_numero: joueur.numero, p_montant: montant }), "Demande envoyée au club du joueur.");
}

export async function repondreTransfert(_: Etat, f: FormData): Promise<Etat> {
  const accepte = texte(f, "reponse") === "oui";
  return ecrire("mercato", (db) => db.rpc("repondre_transfert", { p_id: texte(f, "id"), p_accepte: accepte }), accepte ? "Accord donné : le comité doit valider." : "Demande refusée.");
}

export async function validerTransfert(_: Etat, f: FormData): Promise<Etat> {
  const valide = texte(f, "decision") === "oui";
  return ecrire("mercato", (db) => db.rpc("valider_transfert", { p_id: texte(f, "id"), p_valide: valide }), valide ? "Transfert validé : le joueur a changé de club." : "Transfert refusé.");
}
