"use server";

import { ecrire, texte, type Etat } from "@/lib/admin";
import { exigerClub } from "@/lib/auth";
import { deposerPhoto, fichierPhoto, photoInvalide, retirerPhotos } from "@/lib/photos";
import { createClient } from "@/lib/supabase/server";

// Actualités du club sur sa page publique, et modération des commentaires du public.
// La base vérifie que l'actualité appartient bien au club du président (ou que c'est le comité).

export async function publierActualite(_: Etat, f: FormData): Promise<Etat> {
  const { club_id } = await exigerClub();
  const message = texte(f, "texte").slice(0, 2000);
  if (!message) return { erreur: "Écrivez un texte pour accompagner la publication." };
  const fichier = fichierPhoto(f, "image");
  const invalide = photoInvalide(fichier);
  if (invalide) return { erreur: invalide };
  let image_url: string | null;
  try {
    image_url = await deposerPhoto(await createClient(), club_id, fichier);
  } catch (e) {
    return { erreur: (e as Error).message };
  }
  const r = await ecrire("club", (db) => db.from("actualites_club").insert({ club_id, texte: message, image_url }), "Publié sur la page du club.");
  if (r.erreur) await retirerPhotos([image_url]);
  return r;
}

export async function masquerActualite(_: Etat, f: FormData): Promise<Etat> {
  await exigerClub();
  const masquee = f.get("masquee") === "true";
  return ecrire("club", (db) => db.from("actualites_club").update({ masquee }).eq("id", texte(f, "id")), masquee ? "Publication masquée." : "Publication visible.");
}

export async function supprimerActualite(_: Etat, f: FormData): Promise<Etat> {
  await exigerClub();
  const r = await ecrire("club", (db) => db.from("actualites_club").delete().eq("id", texte(f, "id")), "Publication supprimée.");
  if (!r.erreur) await retirerPhotos([texte(f, "image_url")]);
  return r;
}

export async function masquerCommentaire(_: Etat, f: FormData): Promise<Etat> {
  await exigerClub();
  const masque = f.get("masque") === "true";
  return ecrire("club", (db) => db.from("commentaires_club").update({ masque }).eq("id", texte(f, "id")), masque ? "Commentaire masqué." : "Commentaire visible.");
}

export async function supprimerCommentaire(_: Etat, f: FormData): Promise<Etat> {
  await exigerClub();
  return ecrire("club", (db) => db.from("commentaires_club").delete().eq("id", texte(f, "id")), "Commentaire supprimé.");
}
