import "server-only";
import { revalidatePath } from "next/cache";
import { exigerAcces } from "./auth";
import { createClient } from "./supabase/server";

export type Etat = { ok?: string; erreur?: string };

export const texte = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
export const texteOuNull = (f: FormData, k: string) => texte(f, k) || null;
export const entier = (f: FormData, k: string) => {
  const v = texte(f, k);
  return v === "" ? null : Number.parseInt(v, 10);
};
export const coche = (f: FormData, k: string) => f.get(k) === "on";

/**
 * Exécute une écriture avec la session de l'organisateur : la base vérifie ses droits (RLS),
 * puis rafraîchit les pages publiques.
 */
export async function ecrire(
  page: string,
  op: (db: Awaited<ReturnType<typeof createClient>>) => PromiseLike<{ error: { message: string; code?: string } | null }>,
  ok = "Enregistré.",
): Promise<Etat> {
  await exigerAcces(page);
  const db = await createClient();
  const { error } = await op(db);
  if (error) {
    console.error(error);
    if (error.code === "23505") return { erreur: "Cet élément existe déjà." };
    if (error.code === "23514" || error.code === "22P02") return { erreur: "Valeur invalide, vérifiez le formulaire." };
    if (error.code === "42501") return { erreur: "Votre rôle ne permet pas cette modification." };
    // Règles métier levées par la base (licences) : leur message est fait pour être lu.
    if (error.code === "P0001") return { erreur: error.message };
    return { erreur: "Enregistrement impossible. Réessayez." };
  }
  revalidatePath("/", "layout");
  return { ok };
}
