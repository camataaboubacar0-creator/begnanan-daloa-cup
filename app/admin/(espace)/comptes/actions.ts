"use server";

import { revalidatePath } from "next/cache";
import { coche, texte, type Etat } from "@/lib/admin";
import { exigerAcces } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { ROLES, type Role } from "@/lib/types";

const roleValide = (r: string): r is Role => r in ROLES;

/**
 * Crée le compte d'un organisateur avec un mot de passe provisoire,
 * à lui remettre en main propre : il le change dès sa première connexion.
 */
export async function creerCompte(_: Etat, f: FormData): Promise<Etat> {
  await exigerAcces("comptes");
  const email = texte(f, "email").toLowerCase();
  const nom = texte(f, "nom");
  const role = texte(f, "role");
  const mdp = texte(f, "motdepasse");
  if (!email || !nom || !roleValide(role)) return { erreur: "E-mail, nom et rôle sont obligatoires." };
  if (mdp.length < 10) return { erreur: "Mot de passe provisoire : 10 caractères minimum." };

  const admin = createServiceClient();
  const { data, error } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true });
  if (error || !data.user) return { erreur: error?.message.includes("already") ? "Un compte existe déjà avec cet e-mail." : "Création impossible." };
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
