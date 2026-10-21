"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { coche, ecrire, entier, texte, texteOuNull, type Etat } from "@/lib/admin";
import { exigerAcces } from "@/lib/auth";
import { sigleDe } from "@/lib/format";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// Mot de passe provisoire lisible (sans 0/O ni 1/l), à transmettre au président.
function motDePasseProvisoire() {
  const a = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 12 }, (_, i) => (i > 0 && i % 4 === 0 ? "-" : "") + a[randomInt(a.length)]).join("");
}

/**
 * Accepte une demande : crée le club, puis le compte du président avec un mot de passe provisoire.
 * En cas d'échec à mi-chemin, ce qui a été créé est retiré.
 */
export async function accepterDemande(_: Etat, f: FormData): Promise<Etat> {
  await exigerAcces("licences");
  const admin = createServiceClient();
  const { data: d } = await admin.from("demandes_club").select("*").eq("id", texte(f, "id")).eq("statut", "en attente").maybeSingle();
  if (!d) return { erreur: "Demande introuvable ou déjà traitée." };

  const { data: club, error: e1 } = await admin
    .from("clubs")
    .insert({ nom: d.nom_club, sigle: sigleDe(d.nom_club), quartier: d.quartier })
    .select("id")
    .single();
  if (e1 || !club) return { erreur: e1?.code === "23505" ? "Un club porte déjà ce nom : renommez-le d'abord dans « Clubs et matchs »." : "Création du club impossible." };

  const mdp = motDePasseProvisoire();
  const { data: u, error: e2 } = await admin.auth.admin.createUser({ email: d.email, password: mdp, email_confirm: true });
  if (e2 || !u.user) {
    await admin.from("clubs").delete().eq("id", club.id);
    return { erreur: e2?.message.includes("already") ? "Un compte existe déjà avec cet e-mail." : "Création du compte impossible." };
  }
  const { error: e3 } = await admin.from("presidents").insert({ user_id: u.user.id, club_id: club.id, nom: d.president_nom });
  if (e3) {
    await admin.auth.admin.deleteUser(u.user.id);
    await admin.from("clubs").delete().eq("id", club.id);
    return { erreur: "Création du compte impossible." };
  }
  await admin.from("demandes_club").update({ statut: "acceptée", club_id: club.id, traitee_le: new Date().toISOString() }).eq("id", d.id);
  // Fiche (et carte) du président, créée avec la session du comité : la base n'accepte une carte validée que de lui.
  const [nom, ...prenoms] = d.president_nom.trim().split(/\s+/);
  await (await createClient())
    .from("encadrants")
    .insert({ club_id: club.id, fonction: "président", nom, prenoms: prenoms.join(" ") || "—", telephone: d.telephone, valide: true });
  revalidatePath("/", "layout");
  return { ok: `Club créé. Identifiants à transmettre à ${d.president_nom} : ${d.email} / ${mdp}` };
}

export async function refuserDemande(_: Etat, f: FormData): Promise<Etat> {
  return ecrire(
    "licences",
    (db) => db.from("demandes_club").update({ statut: "refusée", traitee_le: new Date().toISOString() }).eq("id", texte(f, "id")).eq("statut", "en attente"),
    "Demande refusée.",
  );
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
  return ecrire(
    "licences",
    (db) => db.from("encadrants").upsert({ ...fiche, club_id: texte(f, "club_id"), fonction: "président" }, { onConflict: "club_id,fonction" }),
    "Fiche du président enregistrée, carte validée.",
  );
}
