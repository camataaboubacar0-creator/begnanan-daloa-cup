import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient, supabaseConfigured } from "./supabase/server";
import { ROLES, type Role } from "./types";

export interface Organisateur {
  id: string;
  email: string;
  nom: string;
  role: Role;
  /** Club du président, ou club que consulte un membre du comité dans l'espace club. */
  club_id?: string;
  /** Membre du comité qui consulte l'espace d'un club (et non le président lui-même). */
  consultation?: boolean;
}

/** Cookie du club que consulte un membre du comité dans l'espace club. */
export const COOKIE_CLUB_CONSULTE = "club_consulte";

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

/**
 * Espace club : celui du président connecté. Un membre du comité (ou l'administrateur) peut aussi
 * ouvrir l'espace d'un club, choisi sur la page de connexion de l'espace club ; les autres comptes
 * de l'organisation y voient un message qui les renvoie à l'espace pro.
 */
export async function exigerClub() {
  const orga = await getOrganisateur();
  if (orga?.role === "president" && orga.club_id) return orga as Organisateur & { club_id: string };
  if (orga && peutVoir(orga.role, "club")) {
    const club = (await cookies()).get(COOKIE_CLUB_CONSULTE)?.value;
    if (club) {
      const { data } = await (await createClient()).from("clubs").select("id").eq("id", club).maybeSingle();
      if (data) return { ...orga, club_id: data.id, consultation: true };
    }
  }
  redirect("/espace-club/connexion");
}

/** À appeler en tête de chaque page et action d'administration. */
export async function exigerAcces(page?: string) {
  const orga = await getOrganisateur();
  if (!orga) redirect("/admin/connexion");
  if (page && !peutVoir(orga.role, page)) redirect("/admin");
  return orga;
}
