"use server";

import { revalidatePath } from "next/cache";
import { coche, texte, type Etat } from "@/lib/admin";
import { exigerAcces } from "@/lib/auth";
import { emailDepuisIdentifiant } from "@/lib/identifiant";
import { createServiceClient } from "@/lib/supabase/server";
import { ROLES_ORGANISATEURS, type RoleOrganisateur } from "@/lib/types";

// Les comptes de présidents se créent en acceptant la demande d'inscription du club.
const roleValide = (r: string): r is RoleOrganisateur => (ROLES_ORGANISATEURS as readonly string[]).includes(r);

/**
 * Crée le compte d'un organisateur avec un mot de passe provisoire,
 * à lui remettre en main propre : il le change dès sa première connexion.
 */
export async function creerCompte(_: Etat, f: FormData): Promise<Etat> {
  await exigerAcces("comptes");
  const nom = texte(f, "nom");
  const role = texte(f, "role");
  const mdp = texte(f, "motdepasse");
  if (!texte(f, "email") || !nom || !roleValide(role)) return { erreur: "Identifiant, nom et rôle sont obligatoires." };
  const id = emailDepuisIdentifiant(texte(f, "email"));
  if ("erreur" in id) return { erreur: id.erreur };
  const { email } = id;
  if (mdp.length < 10) return { erreur: "Mot de passe provisoire : 10 caractères minimum." };

  const admin = createServiceClient();
  const { data, error } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true });
  if (error || !data.user) return { erreur: error?.message.includes("already") ? "Cet identifiant est déjà utilisé." : "Création impossible." };
  const { error: e2 } = await admin.from("profils").insert({ user_id: data.user.id, nom, role });
  if (e2) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { erreur: "Création impossible." };
  }
  revalidatePath("/admin/comptes");
  return { ok: `Compte créé pour ${nom}. Remettez-lui le mot de passe provisoire en main propre.` };
}

export async function modifierCompte(_: Etat, f: FormData): Promise<Etat> {
  const moi = await exigerAcces("comptes");
  const id = texte(f, "id");
  const role = texte(f, "role");
  const actif = coche(f, "actif");
  if (!roleValide(role)) return { erreur: "Rôle invalide." };
  if (id === moi.id && (role !== "admin" || !actif)) return { erreur: "Vous ne pouvez pas retirer vos propres droits d'administrateur." };
  const { error } = await createServiceClient().from("profils").update({ role, actif }).eq("user_id", id);
  if (error) return { erreur: "Modification impossible." };
  revalidatePath("/admin/comptes");
  return { ok: "Enregistré." };
}

/**
 * Mot de passe oublié : l'administrateur fixe un mot de passe provisoire, à remettre en main propre.
 * Seulement pour un organisateur ou un président de club, jamais pour un autre compte.
 */
export async function nouveauMotDePasse(_: Etat, f: FormData): Promise<Etat> {
  await exigerAcces("comptes");
  const id = texte(f, "id");
  const mdp = texte(f, "motdepasse");
  if (mdp.length < 10) return { erreur: "Mot de passe provisoire : 10 caractères minimum." };
  const admin = createServiceClient();
  const [{ data: profil }, { data: president }] = await Promise.all([
    admin.from("profils").select("user_id").eq("user_id", id).maybeSingle(),
    admin.from("presidents").select("user_id").eq("user_id", id).maybeSingle(),
  ]);
  if (!profil && !president) return { erreur: "Compte introuvable." };
  const { error } = await admin.auth.admin.updateUserById(id, { password: mdp });
  if (error) {
    console.error(error);
    return { erreur: "Modification impossible. Réessayez." };
  }
  return { ok: "Nouveau mot de passe enregistré. Remettez-le en main propre : il le changera après connexion." };
}
