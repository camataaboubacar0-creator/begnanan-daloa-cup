"use server";

import { coche, ecrire, entier, texte, texteOuNull, type Etat } from "@/lib/admin";

function publication(f: FormData) {
  const publiee = coche(f, "publiee");
  return {
    type: texte(f, "type") as "debrief" | "annonce" | "hdm",
    titre: texte(f, "titre") || (texte(f, "type") === "hdm" ? "Homme du match" : ""),
    texte: texte(f, "texte"),
    match_id: texteOuNull(f, "match_id"),
    joueur: texteOuNull(f, "joueur"),
    club_id: texteOuNull(f, "club_id"),
    video_url: texteOuNull(f, "video_url"),
    publiee,
  };
}

const verifier = (p: ReturnType<typeof publication>) => {
  if (!p.titre) return "Le titre est obligatoire.";
  if (p.type === "hdm" && (!p.joueur || !p.club_id)) return "Pour un homme du match, indiquez le joueur et son club.";
  if (p.video_url && !p.video_url.startsWith("https://")) return "Le lien vidéo doit commencer par https://";
  return null;
};

export async function ajouterPublication(_: Etat, f: FormData): Promise<Etat> {
  const p = publication(f);
  const erreur = verifier(p);
  if (erreur) return { erreur };
  return ecrire("medias", (db) => db.from("publications").insert({ ...p, publiee_le: p.publiee ? new Date().toISOString() : null }), p.publiee ? "Publié." : "Brouillon enregistré.");
}

export async function modifierPublication(_: Etat, f: FormData): Promise<Etat> {
  const p = publication(f);
  const erreur = verifier(p);
  if (erreur) return { erreur };
  // La date de publication est fixée au premier passage en ligne.
  const dejaPubliee = texte(f, "publiee_le");
  const publiee_le = p.publiee ? dejaPubliee || new Date().toISOString() : null;
  return ecrire("medias", (db) => db.from("publications").update({ ...p, publiee_le }).eq("id", texte(f, "id")));
}

export async function supprimerPublication(_: Etat, f: FormData): Promise<Etat> {
  return ecrire("medias", (db) => db.from("publications").delete().eq("id", texte(f, "id")), "Supprimé.");
}

export async function ajouterPhoto(_: Etat, f: FormData): Promise<Etat> {
  const image_url = texte(f, "image_url");
  if (!image_url.startsWith("https://")) return { erreur: "Le lien de l'image doit commencer par https://" };
  return ecrire("medias", (db) => db.from("galerie").insert({ image_url, legende: texte(f, "legende"), ordre: entier(f, "ordre") ?? 0 }), "Photo ajoutée.");
}

export async function supprimerPhoto(_: Etat, f: FormData): Promise<Etat> {
  return ecrire("medias", (db) => db.from("galerie").delete().eq("id", texte(f, "id")), "Photo retirée.");
}
