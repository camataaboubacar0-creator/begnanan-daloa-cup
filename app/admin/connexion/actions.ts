"use server";

import { redirect } from "next/navigation";
import { emailDepuisIdentifiant } from "@/lib/identifiant";
import { createClient, createServiceClient, supabaseConfigured } from "@/lib/supabase/server";

export async function seConnecter(_: { erreur?: string }, form: FormData): Promise<{ erreur?: string }> {
  if (!supabaseConfigured) return { erreur: "La base de données n'est pas encore branchée." };
  const id = emailDepuisIdentifiant(String(form.get("email") ?? ""));
  if ("erreur" in id) return { erreur: "Identifiant ou mot de passe incorrect." };
  const db = await createClient();
  const { data, error } = await db.auth.signInWithPassword({ email: id.email, password: String(form.get("motdepasse") ?? "") });
  if (error || !data.user) return { erreur: "Identifiant ou mot de passe incorrect." };

  // Compte d'un président dont la demande d'inscription n'est pas encore acceptée.
  const [{ data: profil }, { data: president }] = await Promise.all([
    db.from("profils").select("actif").eq("user_id", data.user.id).maybeSingle(),
    db.from("presidents").select("actif").eq("user_id", data.user.id).maybeSingle(),
  ]);
  if (!profil?.actif && !president?.actif) {
    await db.auth.signOut();
    if (profil || president) return { erreur: "Ce compte est désactivé. Contactez le comité." };
    const { data: demande } = await createServiceClient().from("demandes_club").select("statut").eq("user_id", data.user.id).maybeSingle();
    if (demande?.statut === "en attente") return { erreur: "Votre demande d'inscription est en attente : le comité doit encore l'accepter." };
    if (demande?.statut === "refusée") return { erreur: "Votre demande d'inscription a été refusée par le comité." };
    return { erreur: "Ce compte n'a pas encore d'accès. Contactez le comité." };
  }
  // Les présidents vont à l'espace club, les organisateurs à l'espace pro.
  const espace = president?.actif && !profil?.actif ? "/espace-club" : "/admin";
  const suite = String(form.get("suite") ?? "");
  redirect(suite.startsWith(espace) ? suite : espace);
}

export async function seDeconnecter() {
  const db = await createClient();
  await db.auth.signOut();
  redirect("/admin/connexion");
}

export async function quitterEspaceClub() {
  const db = await createClient();
  await db.auth.signOut();
  redirect("/espace-club/connexion");
}
