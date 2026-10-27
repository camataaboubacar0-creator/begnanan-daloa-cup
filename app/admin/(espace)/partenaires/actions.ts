"use server";

import { coche, ecrire, entier, texte, texteOuNull, type Etat } from "@/lib/admin";
import { exigerAcces } from "@/lib/auth";
import { deposerPhoto, fichierPhoto, photoInvalide, retirerPhotos } from "@/lib/photos";
import { createServiceClient } from "@/lib/supabase/server";

const NIVEAUX = ["principal", "officiel", "soutien"];

/** Dépose le logo joint (dossier « partenaires ») ; url null si aucun fichier. */
async function logoJoint(f: FormData): Promise<{ url: string | null } | { erreur: string }> {
  await exigerAcces("partenaires");
  const fichier = fichierPhoto(f, "logo");
  const invalide = photoInvalide(fichier);
  if (invalide) return { erreur: invalide.replace("Photo", "Logo") };
  try {
    return { url: await deposerPhoto(createServiceClient(), "partenaires", fichier) };
  } catch (e) {
    return { erreur: (e as Error).message };
  }
}

function partenaire(f: FormData) {
  return {
    nom: texte(f, "nom").slice(0, 80),
    lien_url: texteOuNull(f, "lien_url"),
    niveau: NIVEAUX.includes(texte(f, "niveau")) ? texte(f, "niveau") : "officiel",
    ordre: entier(f, "ordre") ?? 0,
    visible: coche(f, "visible"),
  };
}

const verifier = (p: ReturnType<typeof partenaire>) =>
  !p.nom ? "Le nom du partenaire est obligatoire." : p.lien_url && !p.lien_url.startsWith("https://") ? "Le lien du site doit commencer par https://" : null;

export async function ajouterPartenaire(_: Etat, f: FormData): Promise<Etat> {
  const p = partenaire(f);
  const erreur = verifier(p);
  if (erreur) return { erreur };
  const logo = await logoJoint(f);
  if ("erreur" in logo) return logo;
  if (!logo.url) return { erreur: "Ajoutez le logo du partenaire." };
  const r = await ecrire("partenaires", (db) => db.from("partenaires").insert({ ...p, logo_url: logo.url }), "Partenaire ajouté.");
  if (r.erreur) await retirerPhotos([logo.url]);
  return r;
}

export async function modifierPartenaire(_: Etat, f: FormData): Promise<Etat> {
  const p = partenaire(f);
  const erreur = verifier(p);
  if (erreur) return { erreur };
  const logo = await logoJoint(f);
  if ("erreur" in logo) return logo;
  const ancien = texte(f, "logo_actuel");
  const r = await ecrire("partenaires", (db) => db.from("partenaires").update({ ...p, ...(logo.url ? { logo_url: logo.url } : {}) }).eq("id", texte(f, "id")));
  await retirerPhotos(r.erreur ? [logo.url] : logo.url ? [ancien] : []);
  return r;
}

export async function supprimerPartenaire(_: Etat, f: FormData): Promise<Etat> {
  const r = await ecrire("partenaires", (db) => db.from("partenaires").delete().eq("id", texte(f, "id")), "Partenaire retiré.");
  if (!r.erreur) await retirerPhotos([texte(f, "logo_actuel")]);
  return r;
}
