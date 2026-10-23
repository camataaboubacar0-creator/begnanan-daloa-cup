"use server";

import { ecrire, entier, texte, texteOuNull, type Etat } from "@/lib/admin";
import { exigerClub } from "@/lib/auth";
import { deposerPhoto, fichierPhoto, photoInvalide } from "@/lib/photos";
import { createClient } from "@/lib/supabase/server";

// Espace club. Le club vient toujours du compte connecté ; la base le vérifie aussi (sécurité par ligne).
// Ce qui n'est pas encore validé (brouillons, licences à corriger, encadrement en attente) se modifie
// directement ; le reste (profil du club, licences, cartes validées) passe par une demande au comité.

const joueur = (f: FormData) => ({
  nom: texte(f, "nom").slice(0, 60),
  prenoms: texte(f, "prenoms").slice(0, 80),
  poste: texteOuNull(f, "poste"),
  numero_maillot: entier(f, "numero_maillot"),
});

const valide = (j: ReturnType<typeof joueur>) =>
  !j.nom || !j.prenoms ? "Nom et prénoms sont obligatoires." : null;

const encadrant = (f: FormData) => ({ nom: texte(f, "nom").slice(0, 60), prenoms: texte(f, "prenoms").slice(0, 80), telephone: texteOuNull(f, "telephone") });

const PHOTO_LICENCE = "Ajoutez la photo du joueur : elle figure sur sa licence.";

/** Dépose la photo jointe dans le dossier du club ; url null si aucun fichier. */
async function photoDuClub(f: FormData, champ: string): Promise<{ url: string | null } | { erreur: string }> {
  const fichier = fichierPhoto(f, champ);
  const invalide = photoInvalide(fichier);
  if (invalide) return { erreur: invalide };
  const { club_id } = await exigerClub();
  try {
    return { url: await deposerPhoto(await createClient(), club_id, fichier) };
  } catch (e) {
    return { erreur: (e as Error).message };
  }
}

/** Demande de modification ou de retrait, appliquée seulement quand le comité l'accepte. */
async function proposer(objet: "profil" | "joueur" | "encadrant", action: "modifier" | "retirer", cible: string | null, donnees: object, libelle: string | null, ok: string) {
  const { club_id } = await exigerClub();
  return ecrire("club", (db) => db.from("modifications_club").insert({ club_id, objet, action, cible, donnees, libelle }), ok);
}

const ENVOYEE = "Demande envoyée : le comité doit l'accepter.";

export async function proposerProfil(_: Etat, f: FormData): Promise<Etat> {
  const couleur = texte(f, "couleur");
  if (couleur && !/^#[0-9a-fA-F]{6}$/.test(couleur)) return { erreur: "Couleur invalide." };
  const logo = await photoDuClub(f, "logo");
  if ("erreur" in logo) return logo;
  const donnees = {
    ...(logo.url ? { logo_url: logo.url } : {}),
    ...(couleur ? { couleur } : {}),
    quartier: texte(f, "quartier").slice(0, 60),
    presentation: texte(f, "presentation").slice(0, 600),
  };
  return proposer("profil", "modifier", null, donnees, null, ENVOYEE);
}

export async function ajouterJoueur(_: Etat, f: FormData): Promise<Etat> {
  const { club_id } = await exigerClub();
  const j = joueur(f);
  const erreur = valide(j);
  if (erreur) return { erreur };
  const demander = f.get("demander") === "on";
  if (demander && !fichierPhoto(f, "photo")) return { erreur: PHOTO_LICENCE };
  const photo = await photoDuClub(f, "photo");
  if ("erreur" in photo) return photo;
  return ecrire(
    "club",
    (db) => db.from("joueurs").insert({ ...j, club_id, etat: demander ? "soumise" : "brouillon", photo_url: photo.url }),
    demander ? "Joueur ajouté, licence demandée au comité." : "Joueur enregistré en brouillon.",
  );
}

/** Brouillon ou licence à corriger. */
export async function modifierJoueur(_: Etat, f: FormData): Promise<Etat> {
  await exigerClub();
  const id = texte(f, "id");
  const j = joueur(f);
  const erreur = valide(j);
  if (erreur) return { erreur };
  const demander = f.get("demander") === "on";
  if (demander && !fichierPhoto(f, "photo")) {
    const { data } = await (await createClient()).from("joueurs").select("photo_url").eq("id", id).single();
    if (!data?.photo_url) return { erreur: PHOTO_LICENCE };
  }
  const photo = await photoDuClub(f, "photo");
  if ("erreur" in photo) return photo;
  return ecrire(
    "club",
    (db) => db.from("joueurs").update({ ...j, etat: demander ? "soumise" : "brouillon", ...(photo.url ? { photo_url: photo.url } : {}) }).eq("id", id),
    demander ? "Licence demandée au comité." : "Enregistré.",
  );
}

/** Brouillon ou licence refusée : rien n'a été validé, le club le retire lui-même. */
export async function supprimerJoueur(_: Etat, f: FormData): Promise<Etat> {
  await exigerClub();
  return ecrire("club", (db) => db.from("joueurs").delete().eq("id", texte(f, "id")), "Joueur retiré.");
}

/** Licence demandée ou active : la modification attend l'accord du comité. */
export async function proposerJoueur(_: Etat, f: FormData): Promise<Etat> {
  const j = joueur(f);
  const erreur = valide(j);
  if (erreur) return { erreur };
  const photo = await photoDuClub(f, "photo");
  if ("erreur" in photo) return photo;
  return proposer("joueur", "modifier", texte(f, "id"), { ...j, ...(photo.url ? { photo_url: photo.url } : {}) }, `${j.prenoms} ${j.nom}`, ENVOYEE);
}

/** Retrait d'un joueur licencié ou d'un membre validé de l'encadrement. */
export async function demanderRetrait(_: Etat, f: FormData): Promise<Etat> {
  const objet = texte(f, "objet") === "encadrant" ? "encadrant" : "joueur";
  return proposer(objet, "retirer", texte(f, "id"), {}, texte(f, "libelle").slice(0, 160), "Demande de retrait envoyée au comité.");
}

export async function annulerDemande(_: Etat, f: FormData): Promise<Etat> {
  await exigerClub();
  return ecrire("club", (db) => db.from("modifications_club").update({ statut: "annulée" }).eq("id", texte(f, "id")).eq("statut", "en attente"), "Demande annulée.");
}

const FONCTIONS_CLUB = ["coach", "adjoint"];

/** Coach et adjoint pas encore validés : enregistrés directement, puis validés par le comité. */
export async function enregistrerEncadrant(_: Etat, f: FormData): Promise<Etat> {
  const { club_id } = await exigerClub();
  const fonction = texte(f, "fonction");
  const fiche = encadrant(f);
  if (!FONCTIONS_CLUB.includes(fonction)) return { erreur: "Fonction invalide." };
  if (!fiche.nom || !fiche.prenoms) return { erreur: "Nom et prénoms sont obligatoires." };
  const photo = await photoDuClub(f, "photo");
  if ("erreur" in photo) return photo;
  const id = texte(f, "id");
  const avecPhoto = { ...fiche, ...(photo.url ? { photo_url: photo.url } : {}) };
  return ecrire(
    "club",
    (db) => (id ? db.from("encadrants").update(avecPhoto).eq("id", id) : db.from("encadrants").insert({ ...avecPhoto, fonction, club_id })),
    "Enregistré : le comité doit maintenant valider la carte.",
  );
}

/** Carte validée (ou fiche du président) : la modification attend l'accord du comité. */
export async function proposerEncadrant(_: Etat, f: FormData): Promise<Etat> {
  const fiche = encadrant(f);
  if (!fiche.nom || !fiche.prenoms) return { erreur: "Nom et prénoms sont obligatoires." };
  const photo = await photoDuClub(f, "photo");
  if ("erreur" in photo) return photo;
  return proposer("encadrant", "modifier", texte(f, "id"), { ...fiche, ...(photo.url ? { photo_url: photo.url } : {}) }, `${fiche.prenoms} ${fiche.nom}`, ENVOYEE);
}

export async function retirerEncadrant(_: Etat, f: FormData): Promise<Etat> {
  await exigerClub();
  return ecrire("club", (db) => db.from("encadrants").delete().eq("id", texte(f, "id")), "Retiré.");
}

export async function envoyerMessage(_: Etat, f: FormData): Promise<Etat> {
  const { club_id } = await exigerClub();
  const message = texte(f, "texte").slice(0, 1000);
  if (!message) return { erreur: "Écrivez votre message." };
  return ecrire("messages", (db) => db.from("messages_club").insert({ club_id, texte: message }), "Message envoyé au comité.");
}

export async function changerMotDePasse(_: Etat, f: FormData): Promise<Etat> {
  await exigerClub();
  const mdp = texte(f, "motdepasse");
  if (mdp.length < 8) return { erreur: "8 caractères minimum." };
  if (mdp !== texte(f, "confirmation")) return { erreur: "Les deux mots de passe ne correspondent pas." };
  const { error } = await (await createClient()).auth.updateUser({ password: mdp });
  return error ? { erreur: "Modification impossible. Réessayez." } : { ok: "Mot de passe modifié." };
}
