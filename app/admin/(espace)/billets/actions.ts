"use server";

import { coche, ecrire, entier, texte, type Etat } from "@/lib/admin";
import { exigerAcces } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const categorie = (f: FormData) => ({
  nom: texte(f, "nom"),
  description: texte(f, "description"),
  prix_fcfa: entier(f, "prix_fcfa") ?? 0,
  places_par_match: entier(f, "places_par_match") ?? 0,
  en_vente: coche(f, "en_vente"),
  ordre: entier(f, "ordre") ?? 0,
});

export async function ajouterCategorie(_: Etat, f: FormData): Promise<Etat> {
  const c = categorie(f);
  if (!c.nom) return { erreur: "Donnez un nom à la catégorie." };
  return ecrire("billets", (db) => db.from("categories_billet").insert(c), "Catégorie ajoutée.");
}

// Les commandes gardent le prix payé : modifier un tarif ne touche pas aux ventes passées.
export async function modifierCategorie(_: Etat, f: FormData): Promise<Etat> {
  return ecrire("billets", (db) => db.from("categories_billet").update(categorie(f)).eq("id", texte(f, "id")));
}

export async function supprimerCategorie(_: Etat, f: FormData): Promise<Etat> {
  const r = await ecrire("billets", (db) => db.from("categories_billet").delete().eq("id", texte(f, "id")), "Catégorie supprimée.");
  return r.erreur ? { erreur: "Impossible : des billets ont été vendus. Retirez-la plutôt de la vente." } : r;
}

export async function controlerBillet(_: Etat, f: FormData): Promise<Etat> {
  await exigerAcces("billets");
  const db = await createClient();
  const { data, error } = await db.rpc("valider_entree", { ref: texte(f, "reference") });
  if (error) return { erreur: "Contrôle impossible. Réessayez." };
  const r = data?.[0];
  if (!r || r.resultat === "inconnu") return { erreur: "Billet inconnu ou non payé. Refuser l'entrée." };
  if (r.resultat === "déjà utilisé") return { erreur: `Déjà utilisé : ${r.entrees}/${r.quantite} entrées (${r.acheteur}).` };
  return { ok: `Entrée valide · ${r.categorie} · ${r.entrees}/${r.quantite} · ${r.acheteur}` };
}
