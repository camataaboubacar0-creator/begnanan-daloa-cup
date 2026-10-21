"use server";

import { coche, ecrire, entier, texte, type Etat } from "@/lib/admin";

// Toutes les règles du mercato sont appliquées par la base (fonctions demander/répondre/valider_transfert).

export async function ouvrirMercato(_: Etat, f: FormData): Promise<Etat> {
  const ouvert = coche(f, "mercato_ouvert");
  return ecrire("mercato", (db) => db.from("tournoi").update({ mercato_ouvert: ouvert }).eq("id", 1), ouvert ? "Mercato ouvert." : "Mercato fermé.");
}

export async function disqualifierClub(_: Etat, f: FormData): Promise<Etat> {
  const oui = coche(f, "disqualifie");
  return ecrire("mercato", (db) => db.from("clubs").update({ disqualifie: oui }).eq("id", texte(f, "id")), oui ? "Club disqualifié." : "Club réintégré.");
}

export async function demanderTransfert(_: Etat, f: FormData): Promise<Etat> {
  const numero = texte(f, "numero");
  const montant = entier(f, "montant");
  if (!numero) return { erreur: "Indiquez le numéro de licence du joueur." };
  if (montant !== null && (Number.isNaN(montant) || montant < 0)) return { erreur: "Montant invalide." };
  return ecrire("mercato", (db) => db.rpc("demander_transfert", { p_numero: numero, p_montant: montant }), "Demande envoyée au club du joueur.");
}

export async function repondreTransfert(_: Etat, f: FormData): Promise<Etat> {
  const accepte = texte(f, "reponse") === "oui";
  return ecrire("mercato", (db) => db.rpc("repondre_transfert", { p_id: texte(f, "id"), p_accepte: accepte }), accepte ? "Accord donné : le comité doit valider." : "Demande refusée.");
}

export async function validerTransfert(_: Etat, f: FormData): Promise<Etat> {
  const valide = texte(f, "decision") === "oui";
  return ecrire("mercato", (db) => db.rpc("valider_transfert", { p_id: texte(f, "id"), p_valide: valide }), valide ? "Transfert validé : le joueur a changé de club." : "Transfert refusé.");
}
