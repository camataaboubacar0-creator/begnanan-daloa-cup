"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { texte } from "@/lib/admin";
import { COOKIE_CLUB_CONSULTE, exigerAcces } from "@/lib/auth";

/** Un membre du comité ouvre l'espace d'un club. */
export async function consulterClub(f: FormData) {
  await exigerAcces("club");
  (await cookies()).set(COOKIE_CLUB_CONSULTE, texte(f, "club_id"), { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 12 });
  redirect("/espace-club");
}

/** Retour à la liste des clubs. */
export async function changerDeClub() {
  (await cookies()).delete(COOKIE_CLUB_CONSULTE);
  redirect("/espace-club/connexion");
}
