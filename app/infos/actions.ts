"use server";

import { createPublicClient, supabaseConfigured } from "@/lib/supabase/server";

export type EtatAlerte = { ok?: boolean; erreur?: string };

/** Inscription aux alertes WhatsApp (résultats et annonces). */
export async function inscrireAlerte(_: EtatAlerte, form: FormData): Promise<EtatAlerte> {
  const telephone = String(form.get("telephone") ?? "").replace(/[\s.-]/g, "");
  const nom = String(form.get("nom") ?? "").trim().slice(0, 80) || null;
  if (!/^\+?\d{8,15}$/.test(telephone)) return { erreur: "Numéro invalide. Exemple : 07 00 00 00 00." };
  if (!supabaseConfigured) return { erreur: "Les inscriptions ouvriront bientôt." };
  const { error } = await createPublicClient().from("abonnes_alertes").insert({ telephone, nom });
  if (error?.code === "23505") return { ok: true };
  if (error) {
    console.error(error);
    return { erreur: "Inscription impossible pour le moment, réessayez plus tard." };
  }
  return { ok: true };
}
