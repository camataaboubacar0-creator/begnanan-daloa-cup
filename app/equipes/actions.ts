"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { texte, type Etat } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/server";

// Commentaires et « j'aime » du public sur les actualités des clubs. Personne n'écrit directement
// dans la base depuis le navigateur : le site vérifie d'abord (anti-abus), puis écrit avec la clé de service.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COOKIE_VISITEUR = "visiteur";
const MAX_PAR_10_MIN = 5;

/** Adresse IP chiffrée : sert seulement à limiter le nombre de commentaires, jamais affichée. */
async function empreinte() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "inconnue";
  return createHash("sha256").update(`bdc:${ip}`).digest("hex").slice(0, 32);
}

async function actualiteVisible(db: ReturnType<typeof createServiceClient>, id: string) {
  if (!UUID.test(id)) return null;
  const { data } = await db.from("actualites_club").select("id, club_id").eq("id", id).eq("masquee", false).maybeSingle();
  return data;
}

function rafraichir(actu: { id: string; club_id: string }) {
  revalidatePath(`/equipes/${actu.club_id}/actualites/${actu.id}`);
  revalidatePath(`/equipes/${actu.club_id}`);
  revalidatePath("/");
}

export async function commenter(_: Etat, f: FormData): Promise<Etat> {
  // Champ caché aux humains : rempli seulement par les robots.
  if (texte(f, "site")) return { ok: "Merci !" };
  const auteur = texte(f, "auteur").slice(0, 60);
  const message = texte(f, "texte").slice(0, 500);
  if (!auteur || !message) return { erreur: "Indiquez votre nom et votre commentaire." };
  if (/https?:\/\/|www\./i.test(message)) return { erreur: "Les liens ne sont pas acceptés dans les commentaires." };

  const db = createServiceClient();
  const actu = await actualiteVisible(db, texte(f, "actualite_id"));
  if (!actu) return { erreur: "Cette actualité n'existe plus." };

  const trace = await empreinte();
  const depuis = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await db.from("commentaires_club").select("id", { count: "exact", head: true }).eq("empreinte", trace).gte("cree_le", depuis);
  if ((count ?? 0) >= MAX_PAR_10_MIN) return { erreur: "Trop de commentaires d'un coup : réessayez dans quelques minutes." };

  const { error } = await db.from("commentaires_club").insert({ actualite_id: actu.id, auteur, texte: message, empreinte: trace });
  if (error) {
    console.error(error);
    return { erreur: "Envoi impossible. Réessayez." };
  }
  rafraichir(actu);
  return { ok: "Commentaire publié." };
}

/** Ajoute ou retire le « j'aime » du visiteur ; renvoie le nouveau total. */
export async function aimer(actualiteId: string): Promise<{ nb: number; aime: boolean } | null> {
  const db = createServiceClient();
  const actu = await actualiteVisible(db, actualiteId);
  if (!actu) return null;
  const jar = await cookies();
  let visiteur = jar.get(COOKIE_VISITEUR)?.value;
  if (!visiteur || !UUID.test(visiteur)) {
    visiteur = randomUUID();
    jar.set(COOKIE_VISITEUR, visiteur, { httpOnly: true, sameSite: "lax", secure: true, maxAge: 60 * 60 * 24 * 365, path: "/" });
  }
  const { error } = await db.from("jaimes_club").insert({ actualite_id: actu.id, visiteur });
  let aime = true;
  if (error?.code === "23505") {
    await db.from("jaimes_club").delete().eq("actualite_id", actu.id).eq("visiteur", visiteur);
    aime = false;
  } else if (error) {
    console.error(error);
    return null;
  }
  const { data } = await db.from("actualites_club").select("nb_jaime").eq("id", actu.id).single();
  rafraichir(actu);
  return { nb: data?.nb_jaime ?? 0, aime };
}
