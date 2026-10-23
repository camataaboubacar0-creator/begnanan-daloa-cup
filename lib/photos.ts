import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "./supabase/server";

const TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Fichier image joint à un formulaire, ou null si le champ est vide. */
export function fichierPhoto(f: FormData, champ: string): File | null {
  const v = f.get(champ);
  return v instanceof File && v.size > 0 ? v : null;
}

/** Vérifie une photo avant l'envoi ; renvoie un message d'erreur ou null. */
export function photoInvalide(fichier: File | null) {
  if (!fichier) return null;
  if (!TYPES.includes(fichier.type)) return "Photo : formats acceptés JPEG, PNG ou WebP.";
  if (fichier.size > 1024 * 1024) return "Photo trop lourde (1 Mo maximum).";
  return null;
}

/**
 * Dépose une image dans le stockage « photos » et renvoie son adresse publique.
 * `dossier` : identifiant du club, ou « demandes/… » pour une demande d'inscription.
 * La base vérifie qu'un président n'écrit que dans le dossier de son club.
 */
export async function deposerPhoto(db: SupabaseClient, dossier: string, fichier: File | null): Promise<string | null> {
  if (!fichier) return null;
  const extension = fichier.type === "image/png" ? "png" : fichier.type === "image/webp" ? "webp" : "jpg";
  const chemin = `${dossier}/${randomUUID()}.${extension}`;
  const { error } = await db.storage.from("photos").upload(chemin, fichier, { contentType: fichier.type, upsert: false });
  if (error) {
    console.error(error);
    throw new Error("Envoi de la photo impossible. Réessayez.");
  }
  return db.storage.from("photos").getPublicUrl(chemin).data.publicUrl;
}

const PREFIXE = "/storage/v1/object/public/photos/";

/**
 * Supprime du stockage des photos qui ne servent plus (photo remplacée, demande d'inscription
 * échouée), pour ne pas remplir le stockage. Un échec n'empêche rien : la photo reste, c'est tout.
 */
export async function retirerPhotos(urls: (string | null | undefined)[]) {
  const chemins = urls.flatMap((u) => (u && u.includes(PREFIXE) ? [decodeURIComponent(u.split(PREFIXE)[1])] : []));
  if (!chemins.length) return;
  try {
    const { error } = await createServiceClient().storage.from("photos").remove(chemins);
    if (error) console.error(error);
  } catch (e) {
    console.error(e);
  }
}
