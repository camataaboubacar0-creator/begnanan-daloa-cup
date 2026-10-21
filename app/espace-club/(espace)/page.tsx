import Link from "next/link";
import { Formulaire } from "@/components/admin/Formulaire";
import { ChampPhoto } from "@/components/ChampPhoto";
import { exigerClub } from "@/lib/auth";
import { dateCourte } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Club, ModificationClub } from "@/lib/types";
import { annulerDemande, changerMotDePasse, proposerProfil } from "./actions";
import { DemandeEnAttente, StatutDemande } from "./Demandes";

const OBJETS = { profil: "Profil du club", joueur: "Joueur", encadrant: "Encadrement" };

export default async function MonClub() {
  const orga = await exigerClub();
  const db = await createClient();
  const [{ data: c }, { data: joueurs }, { count: recues }, { data: demandes }] = await Promise.all([
    db.from("clubs").select("*").eq("id", orga.club_id).single(),
    db.from("joueurs").select("etat"),
    db.from("transferts").select("id", { count: "exact", head: true }).eq("club_depart", orga.club_id).eq("statut", "demandé"),
    db.from("modifications_club").select("*").order("cree_le", { ascending: false }).limit(20),
  ]);
  const club = c as Club;
  const liste = (demandes ?? []) as ModificationClub[];
  const profilEnAttente = liste.find((d) => d.objet === "profil" && d.statut === "en attente");
  const n = (e: string) => (joueurs ?? []).filter((j) => j.etat === e).length;

  return (
    <>
      <div className="grid g4">
        {([["Licences actives", n("active")], ["En attente du comité", n("soumise")], ["Brouillons", n("brouillon")], ["À corriger", n("refusée")]] as const).map(([k, v]) => (
          <div key={k} className="card">
            <div className="kpi"><span className="k">{k}</span><span className="v num">{v}</span></div>
            <Link className="small" href="/espace-club/joueurs">Ouvrir</Link>
          </div>
        ))}
        {(recues ?? 0) > 0 && (
          <div className="card">
            <div className="kpi"><span className="k">Demandes de transfert reçues</span><span className="v num">{recues}</span></div>
            <Link className="small" href="/espace-club/mercato">Ouvrir</Link>
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Profil du club</h3>
        <div className="profil-club">
          {club.logo_url ? <img className="logo-club grand" src={club.logo_url} alt={`Logo ${club.nom}`} /> : <span className="logo-club grand vide" style={{ background: club.couleur }}>{club.sigle}</span>}
          <div>
            <b>{club.nom}</b>
            <p className="small">
              {club.quartier ?? "Quartier non renseigné"}{club.poule ? ` · Poule ${club.poule}` : ""} · couleur <span className="pastille" style={{ background: club.couleur }} />
            </p>
            {club.presentation && <p className="small">{club.presentation}</p>}
          </div>
        </div>
        {profilEnAttente ? (
          <DemandeEnAttente d={profilEnAttente} />
        ) : (
          <details className="adm-item" style={{ marginTop: 12 }}>
            <summary><b>Proposer une modification</b> <span className="small">(logo, couleur, quartier, présentation)</span></summary>
            <p className="small" style={{ margin: "8px 0" }}>Le comité d&apos;organisation valide chaque modification avant qu&apos;elle apparaisse sur le site. Le nom du club et sa poule sont gérés par le comité.</p>
            <Formulaire action={proposerProfil} bouton="Envoyer au comité">
              <ChampPhoto name="logo" label="Logo du club" actuelle={club.logo_url} />
              <label className="field">Couleur du club<input name="couleur" type="color" defaultValue={club.couleur} /></label>
              <label className="field">Quartier<input name="quartier" defaultValue={club.quartier ?? ""} maxLength={60} /></label>
              <label className="field full">Présentation<textarea name="presentation" rows={3} defaultValue={club.presentation ?? ""} maxLength={600} /></label>
            </Formulaire>
          </details>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 6 }}>Mes demandes au comité</h3>
        <p className="small" style={{ marginBottom: 12 }}>Modifications et retraits proposés, avec la réponse du comité.</p>
        {!liste.length && <p className="small">Aucune demande pour l&apos;instant.</p>}
        <div className="adm-list">
          {liste.map((d) => (
            <div key={d.id} className="adm-item">
              <b>{d.action === "retirer" ? "Retrait" : "Modification"} · {OBJETS[d.objet]}{d.libelle ? ` · ${d.libelle}` : ""}</b>{" "}
              <StatutDemande d={d} /> <span className="small">· {dateCourte(d.cree_le.slice(0, 10))}</span>
              {d.motif && <p className="small">Motif du comité : {d.motif}</p>}
              {d.statut === "en attente" && (
                <Formulaire action={annulerDemande} bouton="Annuler la demande" className="form-row">
                  <input type="hidden" name="id" value={d.id} />
                </Formulaire>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        <h3 style={{ marginBottom: 12 }}>Mon mot de passe</h3>
        <Formulaire action={changerMotDePasse} bouton="Changer le mot de passe">
          <label className="field">Nouveau mot de passe<input name="motdepasse" type="password" minLength={8} required autoComplete="new-password" /></label>
          <label className="field">Confirmation<input name="confirmation" type="password" minLength={8} required autoComplete="new-password" /></label>
        </Formulaire>
      </div>
    </>
  );
}
