"use server";

import { ecrire, texte, type Etat } from "@/lib/admin";

/** Réponse du comité dans le fil d'un club. */
export async function repondre(_: Etat, f: FormData): Promise<Etat> {
  const message = texte(f, "texte").slice(0, 1000);
  if (!message) return { erreur: "Écrivez votre message." };
  return ecrire("messages", (db) => db.from("messages_club").insert({ club_id: texte(f, "club"), texte: message }), "Message envoyé au club.");
}
