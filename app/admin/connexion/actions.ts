"use server";

import { redirect } from "next/navigation";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

export async function seConnecter(_: { erreur?: string }, form: FormData): Promise<{ erreur?: string }> {
  if (!supabaseConfigured) return { erreur: "La base de données n'est pas encore branchée." };
  const db = await createClient();
  const { error } = await db.auth.signInWithPassword({
    email: String(form.get("email") ?? "").trim(),
    password: String(form.get("motdepasse") ?? ""),
  });
  if (error) return { erreur: "E-mail ou mot de passe incorrect." };
  const suite = String(form.get("suite") ?? "");
  redirect(suite.startsWith("/admin") ? suite : "/admin");
}

export async function seDeconnecter() {
  const db = await createClient();
  await db.auth.signOut();
  redirect("/admin/connexion");
}
