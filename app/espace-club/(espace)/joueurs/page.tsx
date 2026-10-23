import { Formulaire } from "@/components/admin/Formulaire";
import { ChampPhoto } from "@/components/ChampPhoto";
import { exigerClub } from "@/lib/auth";
import { fcfa } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { EtatLicence, Joueur, ModificationClub } from "@/lib/types";
import { ajouterJoueur, demanderRetrait, modifierJoueur, proposerJoueur, supprimerJoueur } from "../actions";
import { DemandeEnAttente } from "../Demandes";

const ETATS: Record<EtatLicence, [string, string]> = {
  brouillon: ["Brouillon", "info"],
  soumise: ["En attente du comité", "warn"],
  active: ["Licence active", "ok"],
  refusée: ["À corriger", "bad"],
};

const POSTES = ["Gardien", "Défenseur", "Milieu", "Attaquant"];

function ChampsJoueur({ j, demander }: { j?: Joueur; demander?: boolean }) {
  return (
    <>
      <label className="field">Nom<input name="nom" defaultValue={j?.nom} required maxLength={60} /></label>
      <label className="field">Prénoms<input name="prenoms" defaultValue={j?.prenoms} required maxLength={80} /></label>
      <label className="field">Poste
        <select name="poste" defaultValue={j?.poste ?? ""}>
          <option value="">—</option>
          {[...new Set([...POSTES, ...(j?.poste ? [j.poste] : [])])].map((p) => <option key={p}>{p}</option>)}
        </select>
      </label>
      <label className="field">Numéro de maillot<input name="numero_maillot" type="number" min={1} max={99} defaultValue={j?.numero_maillot ?? ""} /></label>
      <ChampPhoto name="photo" label="Photo (pour la licence)" actuelle={j?.photo_url} />
      {demander && <label className="chk"><input name="demander" type="checkbox" defaultChecked /> Demander la licence au comité maintenant</label>}
    </>
  );
}

export default async function Joueurs() {
  const orga = await exigerClub();
  const db = await createClient();
  const [{ data: t }, { data: joueurs }, { data: demandes }] = await Promise.all([
    db.from("tournoi").select("licences_incluses, tarif_licence_fcfa").eq("id", 1).single(),
    db.from("joueurs").select("*").eq("club_id", orga.club_id).order("nom"),
    db.from("modifications_club").select("*").eq("objet", "joueur").eq("statut", "en attente"),
  ]);
  const liste = (joueurs ?? []) as Joueur[];
  const attente = new Map(((demandes ?? []) as ModificationClub[]).map((d) => [d.cible, d]));
  const incluses = t?.licences_incluses ?? 10;
  const tarif = t?.tarif_licence_fcfa ?? null;
  const demandees = liste.filter((j) => j.etat === "soumise" || j.etat === "active");
  const payantes = demandees.filter((j) => j.payante);

  return (
    <>
      <div className="card">
        <h3 style={{ marginBottom: 6 }}>Licences</h3>
        <p className="small" style={{ marginBottom: 12 }}>
          {incluses} licences incluses. À partir de la {incluses + 1}ᵉ, chaque licence coûte {tarif === null ? <>un tarif que le comité n&apos;a pas encore fixé <span className="tbc">à confirmer</span></> : fcfa(tarif)}.
          Une licence devient active quand le comité l&apos;a validée (et, si elle est payante, quand le paiement est reçu).
        </p>
        <div className="quota" aria-label={`${Math.min(demandees.length, incluses)} licences incluses utilisées sur ${incluses}`}>
          {Array.from({ length: Math.max(incluses, demandees.length) }, (_, i) => (
            <i key={i} className={i < demandees.length ? (i < incluses ? "inc" : "pay") : ""} />
          ))}
        </div>
        <p className="small" style={{ marginTop: 8 }}>
          <b>{Math.min(demandees.length, incluses)} / {incluses}</b> licences incluses utilisées
          {payantes.length > 0 && <> · <b>{payantes.length}</b> payante{payantes.length > 1 ? "s" : ""}{tarif !== null && <> ({fcfa(payantes.length * tarif)}, dont {fcfa(payantes.filter((j) => j.paiement_recu).length * tarif)} reçus)</>}</>}
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Ajouter un joueur</h3>
        <Formulaire action={ajouterJoueur} bouton="Ajouter le joueur">
          <ChampsJoueur demander />
        </Formulaire>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 6 }}>Mes joueurs ({liste.length})</h3>
        <p className="small" style={{ marginBottom: 12 }}>
          Brouillons et licences à corriger se modifient directement. Pour une licence demandée ou active, la modification ou le retrait est envoyé au comité, qui l&apos;accepte ou non.
        </p>
        {!liste.length && <p className="small">Aucun joueur pour l&apos;instant.</p>}
        <div className="adm-list">
          {liste.map((j) => {
            const [label, ton] = ETATS[j.etat];
            const libre = j.etat === "brouillon" || j.etat === "refusée";
            const demande = attente.get(j.id);
            return (
              <details key={j.id} className="adm-item" open={j.etat === "refusée"}>
                <summary>
                  {j.photo_url ? <img className="vignette" src={j.photo_url} alt="" /> : <span className="vignette" />}
                  <b>{j.prenoms} {j.nom}</b> <span className={`pill ${ton}`}>{label}</span>
                  {j.payante && j.etat !== "brouillon" && <span className="pill warn" style={{ marginLeft: 6 }}>Payante{j.paiement_recu ? " · payée" : ""}</span>}
                  {demande && <span className="pill warn" style={{ marginLeft: 6 }}>Demande en cours</span>}
                </summary>
                {j.etat === "refusée" && j.motif_refus && <p className="form-err" style={{ marginBottom: 8 }}>Motif du comité : {j.motif_refus}</p>}
                {j.numero_licence && <p className="small">Licence {j.numero_licence}</p>}
                {libre ? (
                  <>
                    <Formulaire action={modifierJoueur}>
                      <input type="hidden" name="id" value={j.id} />
                      <ChampsJoueur j={j} demander />
                    </Formulaire>
                    <Formulaire action={supprimerJoueur} bouton="Retirer ce joueur" className="form-row" confirmer={`Retirer ${j.prenoms} ${j.nom} ?`}>
                      <input type="hidden" name="id" value={j.id} />
                    </Formulaire>
                  </>
                ) : demande ? (
                  <DemandeEnAttente d={demande} />
                ) : (
                  <>
                    <p className="small" style={{ margin: "8px 0" }}>Proposer une modification au comité :</p>
                    <Formulaire action={proposerJoueur} bouton="Envoyer au comité">
                      <input type="hidden" name="id" value={j.id} />
                      <ChampsJoueur j={j} />
                    </Formulaire>
                    <Formulaire action={demanderRetrait} bouton="Demander le retrait de ce joueur" className="form-row" confirmer={`Demander au comité de retirer ${j.prenoms} ${j.nom} ?`}>
                      <input type="hidden" name="objet" value="joueur" />
                      <input type="hidden" name="id" value={j.id} />
                      <input type="hidden" name="libelle" value={`${j.prenoms} ${j.nom}`} />
                    </Formulaire>
                  </>
                )}
              </details>
            );
          })}
        </div>
      </div>
    </>
  );
}
