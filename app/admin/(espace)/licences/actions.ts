"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { coche, ecrire, entier, texte, texteOuNull, type Etat } from "@/lib/admin";
import { exigerAcces } from "@/lib/auth";
import { sigleDe } from "@/lib/format";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { deposerPhoto, fichierPhoto, photoInvalide } from "@/lib/photos";
import type { DemandeClub } from "@/lib/types";

// Mot de passe provisoire lisible (sans 0/O ni 1/l), à transmettre au président.
function motDePasseProvisoire() {
  const a = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 12 }, (_, i) => (i > 0 && i % 4 === 0 ? "-" : "") + a[randomInt(a.length)]).join("");
}

/**
 * Accepte une demande : crée le club, ouvre le compte du président (créé à l'inscription avec le
 * mot de passe qu'il a choisi ; pour une ancienne demande, un compte avec mot de passe provisoire),
 * puis reprend son encadrement et ses joueurs. En cas d'échec à mi-chemin, ce qui a été créé est retiré.
 */
export async function accepterDemande(_: Etat, f: FormData): Promise<Etat> {
  await exigerAcces("licences");
  const admin = createServiceClient();
  const { data } = await admin.from("demandes_club").select("*").eq("id", texte(f, "id")).eq("statut", "en attente").maybeSingle();
  const d = data as DemandeClub | null;
  if (!d) return { erreur: "Demande introuvable ou déjà traitée." };

  const { data: club, error: e1 } = await admin
    .from("clubs")
    .insert({ nom: d.nom_club, sigle: sigleDe(d.nom_club), quartier: d.quartier, logo_url: d.logo_url ?? null })
    .select("id")
    .single();
  if (e1 || !club) return { erreur: e1?.code === "23505" ? "Un club porte déjà ce nom : renommez-le d'abord dans « Clubs et matchs »." : "Création du club impossible." };

  let userId = d.user_id ?? null;
  let mdp: string | null = null;
  if (!userId) {
    mdp = motDePasseProvisoire();
    const { data: u, error: e2 } = await admin.auth.admin.createUser({ email: d.email, password: mdp, email_confirm: true });
    if (e2 || !u.user) {
      await admin.from("clubs").delete().eq("id", club.id);
      return { erreur: e2?.message.includes("already") ? "Un compte existe déjà avec cet e-mail." : "Création du compte impossible." };
    }
    userId = u.user.id;
  }
  const nomComplet = [d.president_prenoms, d.president_nom].filter(Boolean).join(" ");
  const { error: e3 } = await admin.from("presidents").insert({ user_id: userId, club_id: club.id, nom: nomComplet });
  if (e3) {
    if (mdp) await admin.auth.admin.deleteUser(userId);
    await admin.from("clubs").delete().eq("id", club.id);
    return { erreur: "Création du compte impossible." };
  }
  await admin.from("demandes_club").update({ statut: "acceptée", club_id: club.id, traitee_le: new Date().toISOString() }).eq("id", d.id);

  // Encadrement et joueurs, créés avec la session du comité : la base n'accepte une carte
  // validée que de lui, et applique le quota de licences.
  const db = await createClient();
  const [nom, ...prenoms] = d.president_prenoms ? [d.president_nom] : d.president_nom.trim().split(/\s+/);
  await db.from("encadrants").insert([
    { club_id: club.id, fonction: "président", nom, prenoms: d.president_prenoms || prenoms.join(" ") || "—", telephone: d.telephone, photo_url: d.president_photo_url ?? null, valide: true },
    ...(d.encadrement ?? []).map((e) => ({ club_id: club.id, fonction: e.fonction, nom: e.nom, prenoms: e.prenoms, telephone: e.telephone, photo_url: e.photo_url, valide: true })),
  ]);
  let licences = 0;
  for (const j of d.joueurs ?? []) {
    const joueur = { club_id: club.id, nom: j.nom, prenoms: j.prenoms, date_naissance: j.date_naissance || null, poste: j.poste, numero_maillot: j.numero_maillot, photo_url: j.photo_url };
    // Licence demandée d'office ; au-delà du quota sans tarif fixé, le joueur reste en brouillon.
    const { error } = await db.from("joueurs").insert({ ...joueur, etat: "soumise" });
    if (!error) licences++;
    else await db.from("joueurs").insert(joueur);
  }
  revalidatePath("/", "layout");
  const suite = (d.joueurs ?? []).length ? ` ${licences} licence${licences > 1 ? "s" : ""} à contrôler ci-dessous.` : "";
  return {
    ok: mdp
      ? `Club créé. Identifiants à transmettre à ${nomComplet} : ${d.email} / ${mdp}.${suite}`
      : `Club créé : ${nomComplet} peut se connecter avec « ${d.identifiant ?? d.email} » et son mot de passe.${suite}`,
  };
}

/** Refuse une demande ; le compte créé à l'inscription est supprimé. */
export async function refuserDemande(_: Etat, f: FormData): Promise<Etat> {
  const r = await ecrire(
    "licences",
    (db) => db.from("demandes_club").update({ statut: "refusée", traitee_le: new Date().toISOString() }).eq("id", texte(f, "id")).eq("statut", "en attente"),
    "Demande refusée.",
  );
  if (r.ok) {
    const admin = createServiceClient();
    const { data } = await admin.from("demandes_club").select("user_id").eq("id", texte(f, "id")).maybeSingle();
    if (data?.user_id) await admin.auth.admin.deleteUser(data.user_id);
  }
  return r;
}

export async function reglerLicences(_: Etat, f: FormData): Promise<Etat> {
  const incluses = entier(f, "licences_incluses");
  const tarif = entier(f, "tarif_licence_fcfa");
  if (incluses === null || incluses < 0 || incluses > 60) return { erreur: "Nombre de licences incluses invalide." };
  if (tarif !== null && tarif < 0) return { erreur: "Tarif invalide." };
  return ecrire("licences", (db) => db.from("tournoi").update({ licences_incluses: incluses, tarif_licence_fcfa: tarif }).eq("id", 1));
}

/** Les deux contrôles du comité ; la base active la licence quand ils sont faits. */
export async function controlerLicence(_: Etat, f: FormData): Promise<Etat> {
  return ecrire("licences", (db) =>
    db
      .from("joueurs")
      .update({ validation_sportive: coche(f, "validation_sportive"), paiement_recu: coche(f, "paiement_recu") })
      .eq("id", texte(f, "id")),
  );
}

export async function refuserLicence(_: Etat, f: FormData): Promise<Etat> {
  const motif = texte(f, "motif").slice(0, 300);
  if (!motif) return { erreur: "Indiquez le motif : le président le verra pour corriger." };
  return ecrire(
    "licences",
    (db) => db.from("joueurs").update({ etat: "refusée", validation_sportive: false, motif_refus: motif }).eq("id", texte(f, "id")),
    "Licence refusée.",
  );
}

/** Valide (ou retire) la carte d'un membre de l'encadrement ; la base attribue le numéro. */
export async function validerEncadrant(_: Etat, f: FormData): Promise<Etat> {
  return ecrire("licences", (db) => db.from("encadrants").update({ valide: coche(f, "valide") }).eq("id", texte(f, "id")));
}

/** Fiche du président (clubs créés à la main, ou correction du nom). */
export async function enregistrerPresident(_: Etat, f: FormData): Promise<Etat> {
  const fiche = { nom: texte(f, "nom").slice(0, 60), prenoms: texte(f, "prenoms").slice(0, 80), telephone: texteOuNull(f, "telephone"), valide: true };
  if (!fiche.nom || !fiche.prenoms) return { erreur: "Nom et prénoms sont obligatoires." };
  const photo = fichierPhoto(f, "photo");
  const erreur = photoInvalide(photo);
  if (erreur) return { erreur };
  const clubId = texte(f, "club_id");
  return ecrire(
    "licences",
    async (db) => {
      const photo_url = await deposerPhoto(db, clubId, photo).catch(() => undefined);
      if (photo_url === undefined) return { error: { code: "P0001", message: "Envoi de la photo impossible. Réessayez." } };
      return db.from("encadrants").upsert({ ...fiche, ...(photo_url ? { photo_url } : {}), club_id: clubId, fonction: "président" }, { onConflict: "club_id,fonction" });
    },
    "Fiche du président enregistrée, carte validée.",
  );
}

/** Modification ou retrait proposé par un club depuis son espace : appliqué seulement si accepté. */
export async function traiterModification(_: Etat, f: FormData): Promise<Etat> {
  const accepter = f.get("decision") === "accepter";
  const motif = texteOuNull(f, "motif");
  if (!accepter && !motif) return { erreur: "Indiquez le motif du refus : le club le verra." };
  return ecrire(
    "licences",
    (db) => db.rpc("traiter_modification", { p_id: texte(f, "id"), p_accepter: accepter, p_motif: motif }),
    accepter ? "Modification acceptée et appliquée." : "Demande refusée.",
  );
}
