"use server";

import { randomUUID } from "node:crypto";
import { emailDepuisIdentifiant, identifiantAffiche } from "@/lib/identifiant";
import { deposerPhoto, fichierPhoto, photoInvalide } from "@/lib/photos";
import { createServiceClient, supabaseConfigured } from "@/lib/supabase/server";

export type EtatDemande = { ok?: boolean; identifiant?: string; erreur?: string };

const champ = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);

/**
 * Demande d'inscription d'un club, déposée par son président avec son encadrement et ses joueurs.
 * Le compte du président est créé tout de suite avec le mot de passe qu'il a choisi, mais il ne
 * donne accès à rien tant que le comité n'a pas accepté la demande.
 */
export async function deposerDemande(_: EtatDemande, f: FormData): Promise<EtatDemande> {
  const telephone = champ(f, "telephone", 20).replace(/[.-]/g, " ").replace(/\s+/g, " ");
  const base = {
    nom_club: champ(f, "nom_club", 60),
    quartier: champ(f, "quartier", 60) || null,
    president_nom: champ(f, "president_nom", 60),
    president_prenoms: champ(f, "president_prenoms", 80),
    telephone,
    message: champ(f, "message", 500) || null,
  };
  if (base.nom_club.length < 2 || base.president_nom.length < 2 || !base.president_prenoms) return { erreur: "Indiquez le nom du club, votre nom et vos prénoms." };
  if (!/^\+?[0-9 ]{8,20}$/.test(telephone)) return { erreur: "Numéro invalide. Exemple : 07 00 00 00 00." };
  const id = emailDepuisIdentifiant(champ(f, "identifiant", 120));
  if ("erreur" in id) return { erreur: id.erreur };
  const mdp = String(f.get("motdepasse") ?? "");
  if (mdp.length < 8) return { erreur: "Mot de passe : 8 caractères minimum." };
  if (mdp !== String(f.get("confirmation") ?? "")) return { erreur: "Les deux mots de passe ne correspondent pas." };

  const encadrement = (["coach", "adjoint"] as const)
    .map((fonction) => ({ fonction, nom: champ(f, `${fonction}_nom`, 60), prenoms: champ(f, `${fonction}_prenoms`, 80), telephone: champ(f, `${fonction}_telephone`, 20) || null, photo: fichierPhoto(f, `${fonction}_photo`) }))
    .filter((e) => e.nom || e.prenoms);
  if (encadrement.some((e) => !e.nom || !e.prenoms)) return { erreur: "Coach et adjoint : indiquez le nom et les prénoms (ou laissez vide)." };

  const cles = String(f.get("joueurs") ?? "").split(",").filter((k) => /^\d+$/.test(k)).slice(0, 40);
  const joueurs = cles
    .map((k) => {
      const numero = Number.parseInt(champ(f, `j${k}_numero`, 2), 10);
      return {
        nom: champ(f, `j${k}_nom`, 60),
        prenoms: champ(f, `j${k}_prenoms`, 80),
        date_naissance: champ(f, `j${k}_naissance`, 10),
        poste: champ(f, `j${k}_poste`, 30) || null,
        numero_maillot: numero >= 1 && numero <= 99 ? numero : null,
        photo: fichierPhoto(f, `j${k}_photo`),
      };
    })
    .filter((j) => j.nom || j.prenoms || j.date_naissance);
  const incomplet = joueurs.findIndex((j) => !j.nom || !j.prenoms || !/^\d{4}-\d{2}-\d{2}$/.test(j.date_naissance));
  if (incomplet >= 0) return { erreur: `Joueur ${incomplet + 1} : nom, prénoms et date de naissance sont obligatoires (ou retirez la ligne).` };

  const photos = [fichierPhoto(f, "logo"), fichierPhoto(f, "president_photo"), ...encadrement.map((e) => e.photo), ...joueurs.map((j) => j.photo)];
  const erreurPhoto = photos.map(photoInvalide).find(Boolean);
  if (erreurPhoto) return { erreur: erreurPhoto };
  if (!supabaseConfigured) return { erreur: "Les inscriptions ouvriront bientôt." };

  const admin = createServiceClient();
  const { data: compte, error: e1 } = await admin.auth.admin.createUser({
    email: id.email,
    password: mdp,
    email_confirm: true,
    user_metadata: { nom: `${base.president_prenoms} ${base.president_nom}` },
  });
  if (e1 || !compte.user) {
    if (e1) console.error(e1);
    return { erreur: e1?.message.includes("already") ? "Cet identifiant est déjà utilisé : choisissez-en un autre." : "Envoi impossible pour le moment, réessayez plus tard." };
  }

  try {
    const dossier = `demandes/${randomUUID()}`;
    const photo = (fichier: File | null) => deposerPhoto(admin, dossier, fichier);
    const { error } = await admin.from("demandes_club").insert({
      ...base,
      email: id.email,
      identifiant: identifiantAffiche(id.email),
      user_id: compte.user.id,
      logo_url: await photo(fichierPhoto(f, "logo")),
      president_photo_url: await photo(fichierPhoto(f, "president_photo")),
      encadrement: await Promise.all(encadrement.map(async ({ photo: p, ...e }) => ({ ...e, photo_url: await photo(p) }))),
      joueurs: await Promise.all(joueurs.map(async ({ photo: p, ...j }) => ({ ...j, photo_url: await photo(p) }))),
    });
    if (error) throw error;
  } catch (e) {
    console.error(e);
    await admin.auth.admin.deleteUser(compte.user.id);
    return { erreur: e instanceof Error && e.message.startsWith("Envoi de la photo") ? e.message : "Envoi impossible pour le moment, réessayez plus tard." };
  }
  return { ok: true, identifiant: identifiantAffiche(id.email) };
}
