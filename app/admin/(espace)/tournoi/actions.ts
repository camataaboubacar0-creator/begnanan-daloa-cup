"use server";

import { coche, ecrire, entier, texte, type Etat } from "@/lib/admin";

export async function enregistrerTournoi(_: Etat, f: FormData): Promise<Etat> {
  const valeurs = {
    nom: texte(f, "nom"),
    lieu: texte(f, "lieu"),
    date_debut: texte(f, "date_debut"),
    date_fin: texte(f, "date_fin"),
    dates_confirmees: coche(f, "dates_confirmees"),
    accroche: texte(f, "accroche"),
    capacite_clubs: entier(f, "capacite_clubs") ?? 32,
    modifie_le: new Date().toISOString(),
  };
  if (!valeurs.nom || !valeurs.lieu) return { erreur: "Le nom et le lieu sont obligatoires." };
  if (valeurs.date_fin < valeurs.date_debut) return { erreur: "La date de fin précède la date de début." };
  return ecrire("tournoi", (db) => db.from("tournoi").update(valeurs).eq("id", 1));
}
