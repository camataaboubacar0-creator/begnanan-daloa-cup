"use server";

import { createPublicClient, supabaseConfigured } from "@/lib/supabase/server";

export type EtatDemande = { ok?: boolean; erreur?: string };

const champ = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);

/** Demande d'inscription d'un club, déposée par son président. Le comité l'accepte ou la refuse. */
export async function deposerDemande(_: EtatDemande, f: FormData): Promise<EtatDemande> {
  const demande = {
    nom_club: champ(f, "nom_club", 60),
    quartier: champ(f, "quartier", 60) || null,
    president_nom: champ(f, "president_nom", 80),
    telephone: champ(f, "telephone", 20).replace(/[.-]/g, " ").replace(/\s+/g, " "),
    email: champ(f, "email", 120).toLowerCase(),
    message: champ(f, "message", 500) || null,
  };
  if (demande.nom_club.length < 2 || demande.president_nom.length < 2) return { erreur: "Indiquez le nom du club et votre nom." };
  if (!/^\+?[0-9 ]{8,20}$/.test(demande.telephone)) return { erreur: "Numéro invalide. Exemple : 07 00 00 00 00." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(demande.email)) return { erreur: "Adresse e-mail invalide." };
  if (!supabaseConfigured) return { erreur: "Les inscriptions ouvriront bientôt." };
  const { error } = await createPublicClient().from("demandes_club").insert(demande);
  if (error) {
    console.error(error);
    return { erreur: "Envoi impossible pour le moment, réessayez plus tard." };
  }
  return { ok: true };
}
