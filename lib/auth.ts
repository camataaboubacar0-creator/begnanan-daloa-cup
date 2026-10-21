import "server-only";
import { redirect } from "next/navigation";
import { createClient, supabaseConfigured } from "./supabase/server";
import { ROLES, type Role } from "./types";

export interface Organisateur {
  id: string;
  email: string;
  nom: string;
  role: Role;
}

/** Organisateur connecté et actif, ou null. */
export async function getOrganisateur(): Promise<Organisateur | null> {
  if (!supabaseConfigured) return null;
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) return null;
  const { data: profil } = await db.from("profils").select("nom, role, actif").eq("user_id", data.user.id).maybeSingle();
  if (!profil?.actif) return null;
  return { id: data.user.id, email: data.user.email ?? "", nom: profil.nom, role: profil.role };
}

export const peutVoir = (role: Role, page: string) => ROLES[role].pages.includes(page);

/** À appeler en tête de chaque page et action d'administration. */
export async function exigerAcces(page?: string) {
  const orga = await getOrganisateur();
  if (!orga) redirect("/admin/connexion");
  if (page && !peutVoir(orga.role, page)) redirect("/admin");
  return orga;
}
