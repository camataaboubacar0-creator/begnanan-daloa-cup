"use server";

import { ecrire, entier, texte, texteOuNull, type Etat } from "@/lib/admin";
import { exigerAcces } from "@/lib/auth";

const joueur = (f: FormData) => ({
  nom: texte(f, "nom").slice(0, 60),
  prenoms: texte(f, "prenoms").slice(0, 80),
  date_naissance: texte(f, "date_naissance"),
  poste: texteOuNull(f, "poste"),
  numero_maillot: entier(f, "numero_maillot"),
});

const valide = (j: ReturnType<typeof joueur>) =>
  !j.nom || !j.prenoms || !/^\d{4}-\d{2}-\d{2}$/.test(j.date_naissance) ? "Nom, prénoms et date de naissance sont obligatoires." : null;

// Le club vient toujours du compte connecté ; la base le vérifie aussi (sécurité par ligne).
export async function ajouterJoueur(_: Etat, f: FormData): Promise<Etat> {
  const { club_id } = await exigerAcces("club");
  const j = joueur(f);
  const erreur = valide(j);
  if (erreur) return { erreur };
  const etat = f.get("demander") === "on" ? "soumise" : "brouillon";
  return ecrire("club", (db) => db.from("joueurs").insert({ ...j, club_id, etat }), etat === "soumise" ? "Joueur ajouté, licence demandée au comité." : "Joueur enregistré en brouillon.");
}

export async function modifierJoueur(_: Etat, f: FormData): Promise<Etat> {
  await exigerAcces("club");
  const j = joueur(f);
  const erreur = valide(j);
  if (erreur) return { erreur };
  const etat = f.get("demander") === "on" ? "soumise" : "brouillon";
  return ecrire("club", (db) => db.from("joueurs").update({ ...j, etat }).eq("id", texte(f, "id")), etat === "soumise" ? "Licence demandée au comité." : "Enregistré.");
}

export async function supprimerJoueur(_: Etat, f: FormData): Promise<Etat> {
  await exigerAcces("club");
  return ecrire("club", (db) => db.from("joueurs").delete().eq("id", texte(f, "id")), "Joueur retiré.");
}
