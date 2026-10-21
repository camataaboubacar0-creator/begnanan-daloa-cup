"use server";

import { revalidatePath } from "next/cache";
import { coche, ecrire, texte, texteOuNull, type Etat } from "@/lib/admin";
import { exigerAcces } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TYPES_ALERTE, type Alerte } from "@/lib/types";
import { diffuser, envoiAutomatique } from "@/lib/whatsapp";

/** Envoie une annonce à tous les abonnés WhatsApp et la marque comme envoyée. */
async function envoyer(a: Pick<Alerte, "id" | "titre" | "texte">): Promise<Etat> {
  const db = await createClient();
  const { data: abonnes } = await db.from("abonnes_alertes").select("telephone");
  const numeros = (abonnes ?? []).map((x) => x.telephone as string);
  if (!numeros.length) return { erreur: "Aucun abonné pour l'instant." };
  const ok = await diffuser(a, numeros);
  if (!ok) return { erreur: "WhatsApp n'a accepté aucun message : vérifiez les réglages du compte WhatsApp Business." };
  await db.from("alertes").update({ envoyee_le: new Date().toISOString() }).eq("id", a.id);
  revalidatePath("/admin/annonces");
  return { ok: `Envoyée sur WhatsApp à ${ok} abonné${ok > 1 ? "s" : ""} sur ${numeros.length}.` };
}

export async function publierAnnonce(_: Etat, f: FormData): Promise<Etat> {
  const a = {
    type: texte(f, "type"),
    titre: texte(f, "titre").slice(0, 120),
    texte: texte(f, "texte").slice(0, 1000),
    match_id: texteOuNull(f, "match_id"),
  };
  if (!(a.type in TYPES_ALERTE)) return { erreur: "Type invalide." };
  if (a.titre.length < 2) return { erreur: "Donnez un titre à l'annonce." };
  await exigerAcces("annonces");
  const db = await createClient();
  const { data, error } = await db.from("alertes").insert(a).select("id, titre, texte").single();
  if (error || !data) return { erreur: "Publication impossible. Réessayez." };
  revalidatePath("/", "layout");
  if (envoiAutomatique && coche(f, "whatsapp")) {
    const r = await envoyer(data);
    return r.ok ? { ok: `Annonce publiée sur le site. ${r.ok}` } : { erreur: `Annonce publiée sur le site, mais : ${r.erreur}` };
  }
  return { ok: "Annonce publiée sur le site." };
}

export async function envoyerAnnonce(_: Etat, f: FormData): Promise<Etat> {
  await exigerAcces("annonces");
  if (!envoiAutomatique) return { erreur: "L'envoi automatique n'est pas configuré." };
  const db = await createClient();
  const { data } = await db.from("alertes").select("id, titre, texte").eq("id", texte(f, "id")).single();
  return data ? envoyer(data) : { erreur: "Annonce introuvable." };
}

export async function supprimerAnnonce(_: Etat, f: FormData): Promise<Etat> {
  return ecrire("annonces", (db) => db.from("alertes").delete().eq("id", texte(f, "id")), "Annonce retirée du site.");
}

/** Annonces créées automatiquement par la base (match annulé, reporté…) : envoi immédiat si possible. */
export async function envoyerAnnoncesDuMatch(matchId: string) {
  if (!envoiAutomatique) return;
  const db = await createClient();
  const depuis = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data } = await db.from("alertes").select("id, titre, texte").eq("match_id", matchId).is("envoyee_le", null).gte("publiee_le", depuis);
  for (const a of data ?? []) await envoyer(a);
}
