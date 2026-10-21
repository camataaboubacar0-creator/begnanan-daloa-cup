import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient, supabaseConfigured } from "./supabase/server";
import { ROLES, type Role } from "./types";

export interface Organisateur {
  id: string;
  email: string;
  nom: string;
  role: Role;
  /** Club du président (rôle « president » uniquement). */
  club_id?: string;
}

/**
 * Organisateur ou président de club connecté et actif, ou null.
 * Mis en cache le temps d'une requête : la mise en page et la page ne refont pas la vérification.
 */
export const getOrganisateur = cache(async (): Promise<Organisateur | null> => {
  if (!supabaseConfigured) return null;
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) return null;
  const email = data.user.email ?? "";
  const { data: profil } = await db.from("profils").select("nom, role, actif").eq("user_id", data.user.id).maybeSingle();
  if (profil) return profil.actif ? { id: data.user.id, email, nom: profil.nom, role: profil.role } : null;
  const { data: president } = await db.from("presidents").select("nom, club_id, actif").eq("user_id", data.user.id).maybeSingle();
  if (!president?.actif) return null;
  return { id: data.user.id, email, nom: president.nom, role: "president", club_id: president.club_id };
});

export const peutVoir = (role: Role, page: string) => ROLES[role].pages.includes(page);

/** Espace club : réservé aux présidents de club ; les organisateurs vont à l'espace pro. */
export async function exigerClub() {
  const orga = await getOrganisateur();
  if (!orga) redirect("/espace-club/connexion");
  if (orga.role !== "president" || !orga.club_id) redirect("/admin");
  return orga as Organisateur & { club_id: string };
}

/** À appeler en tête de chaque page et action d'administration. */
export async function exigerAcces(page?: string) {
  const orga = await getOrganisateur();
  if (!orga) redirect("/admin/connexion");
  if (page && !peutVoir(orga.role, page)) redirect("/admin");
  return orga;
}
