"use server";

import { coche, ecrire, entier, texte, texteOuNull, type Etat } from "@/lib/admin";
import { envoyerAnnoncesDuMatch } from "../annonces/actions";

const club = (f: FormData) => ({
  nom: texte(f, "nom"),
  sigle: texte(f, "sigle").toUpperCase(),
  couleur: texte(f, "couleur") || "#11802c",
  poule: texteOuNull(f, "poule"),
  quartier: texteOuNull(f, "quartier"),
  logo_url: texteOuNull(f, "logo_url"),
  presentation: texteOuNull(f, "presentation"),
});

export async function ajouterClub(_: Etat, f: FormData): Promise<Etat> {
  const c = club(f);
  if (!c.nom || c.sigle.length < 2) return { erreur: "Nom et sigle (2 à 4 lettres) obligatoires." };
  return ecrire("matchs", (db) => db.from("clubs").insert(c), "Club ajouté.");
}

export async function modifierClub(_: Etat, f: FormData): Promise<Etat> {
  return ecrire("matchs", (db) => db.from("clubs").update(club(f)).eq("id", texte(f, "id")));
}

export async function supprimerClub(_: Etat, f: FormData): Promise<Etat> {
  const r = await ecrire("matchs", (db) => db.from("clubs").delete().eq("id", texte(f, "id")), "Club supprimé.");
  return r.erreur ? { erreur: "Impossible : ce club a déjà des matchs ou des publications." } : r;
}

// Daloa est à l'heure UTC toute l'année : la saisie locale vaut l'heure UTC.
const dateHeure = (f: FormData) => `${texte(f, "date_heure")}:00Z`;

export async function ajouterMatch(_: Etat, f: FormData): Promise<Etat> {
  const m = {
    phase: texte(f, "phase") || "Poules",
    poule: texteOuNull(f, "poule"),
    club_domicile: texte(f, "club_domicile"),
    club_exterieur: texte(f, "club_exterieur"),
    date_heure: dateHeure(f),
    terrain: texte(f, "terrain") || "Terrain A",
  };
  if (!m.club_domicile || m.club_domicile === m.club_exterieur) return { erreur: "Choisissez deux clubs différents." };
  return ecrire("matchs", (db) => db.from("matchs").insert(m), "Match ajouté.");
}

export async function modifierMatch(_: Etat, f: FormData): Promise<Etat> {
  const statut = texte(f, "statut");
  const bd = entier(f, "buts_domicile");
  const be = entier(f, "buts_exterieur");
  const valide = coche(f, "resultat_valide");
  if (statut === "terminé" && (bd === null || be === null)) return { erreur: "Saisissez le score avant de terminer le match." };
  if (valide && statut !== "terminé") return { erreur: "Seul un match terminé peut être validé." };
  const r = await ecrire("matchs", (db) =>
    db
      .from("matchs")
      .update({
        statut,
        buts_domicile: bd,
        buts_exterieur: be,
        resultat_valide: valide,
        date_heure: dateHeure(f),
        terrain: texte(f, "terrain"),
        modifie_le: new Date().toISOString(),
      })
      .eq("id", texte(f, "id")),
  );
  // Match annulé, reporté ou interrompu : la base a créé l'annonce, on la diffuse tout de suite.
  if (r.ok && ["annulé", "reporté", "interrompu"].includes(statut)) {
    await envoyerAnnoncesDuMatch(texte(f, "id"));
    return { ok: "Enregistré. Une annonce a été publiée sur le site (voir « Annonces »)." };
  }
  return r;
}

export async function supprimerMatch(_: Etat, f: FormData): Promise<Etat> {
  const r = await ecrire("matchs", (db) => db.from("matchs").delete().eq("id", texte(f, "id")), "Match supprimé.");
  return r.erreur ? { erreur: "Impossible : des billets ont déjà été vendus pour ce match." } : r;
}
