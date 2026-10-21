"use server";

import { exigerAcces } from "@/lib/auth";
import { texte, type Etat } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export async function changerMotDePasse(_: Etat, f: FormData): Promise<Etat> {
  await exigerAcces();
  const mdp = texte(f, "motdepasse");
  if (mdp.length < 10) return { erreur: "10 caractères minimum." };
  if (mdp !== texte(f, "confirmation")) return { erreur: "Les deux mots de passe ne correspondent pas." };
  const db = await createClient();
  const { error } = await db.auth.updateUser({ password: mdp });
  return error ? { erreur: "Modification impossible. Réessayez." } : { ok: "Mot de passe modifié." };
}
