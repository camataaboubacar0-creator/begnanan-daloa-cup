import Link from "next/link";
import { Formulaire } from "@/components/admin/Formulaire";
import { exigerAcces } from "@/lib/auth";
import { fcfa } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { FONCTIONS, type Encadrant, type EtatLicence, type Joueur } from "@/lib/types";
import { ajouterJoueur, enregistrerEncadrant, modifierJoueur, retirerEncadrant, supprimerJoueur } from "./actions";

const ETATS: Record<EtatLicence, [string, string]> = {
  brouillon: ["Brouillon", "info"],
  soumise: ["En attente du comité", "warn"],
  active: ["Licence active", "ok"],
  refusée: ["À corriger", "bad"],
};

function ChampsJoueur({ j }: { j?: Joueur }) {
  return (
    <>
      <label className="field">Nom<input name="nom" defaultValue={j?.nom} required maxLength={60} /></label>
      <label className="field">Prénoms<input name="prenoms" defaultValue={j?.prenoms} required maxLength={80} /></label>
      <label className="field">Date de naissance<input name="date_naissance" type="date" defaultValue={j?.date_naissance} required /></label>
      <label className="field">Poste<input name="poste" defaultValue={j?.poste ?? ""} maxLength={30} /></label>
      <label className="field">Numéro de maillot<input name="numero_maillot" type="number" min={1} max={99} defaultValue={j?.numero_maillot ?? ""} /></label>
      <label className="chk"><input name="demander" type="checkbox" defaultChecked /> Demander la licence au comité maintenant</label>
    </>
  );
}

export default async function MonClub() {
  const orga = await exigerAcces("club");
  const db = await createClient();
  const [{ data: club }, { data: t }, { data: joueurs }, { data: encadrants }] = await Promise.all([
    db.from("clubs").select("nom").eq("id", orga.club_id!).single(),
    db.from("tournoi").select("licences_incluses, tarif_licence_fcfa").eq("id", 1).single(),
    db.from("joueurs").select("*").order("nom"),
    db.from("encadrants").select("*"),
  ]);
  const staff = (encadrants ?? []) as Encadrant[];
  const fiche = (f: Encadrant["fonction"]) => staff.find((e) => e.fonction === f);
  const president = fiche("président");
  const liste = (joueurs ?? []) as Joueur[];
  const incluses = t?.licences_incluses ?? 10;
  const tarif = t?.tarif_licence_fcfa ?? null;
  const demandees = liste.filter((j) => j.etat === "soumise" || j.etat === "active");
  const payantes = demandees.filter((j) => j.payante);
  const actives = liste.filter((j) => j.etat === "active");
  const cartes = actives.length + staff.filter((e) => e.valide).length;

  return (
    <>
      <div className="card">
        <h3 style={{ marginBottom: 6 }}>{club?.nom ?? "Mon club"}</h3>
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
          <ChampsJoueur />
        </Formulaire>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Mes joueurs ({liste.length})</h3>
        {!liste.length && <p className="small">Aucun joueur pour l&apos;instant.</p>}
        <div className="adm-list">
          {liste.map((j) => {
            const [label, ton] = ETATS[j.etat];
            const modifiable = j.etat === "brouillon" || j.etat === "refusée";
            return (
              <details key={j.id} className="adm-item" open={j.etat === "refusée"}>
                <summary>
                  <b>{j.prenoms} {j.nom}</b> <span className={`pill ${ton}`}>{label}</span>
                  {j.payante && j.etat !== "brouillon" && <span className="pill warn" style={{ marginLeft: 6 }}>Payante{j.paiement_recu ? " · payée" : ""}</span>}
                </summary>
                {j.etat === "refusée" && j.motif_refus && <p className="form-err" style={{ marginBottom: 8 }}>Motif du comité : {j.motif_refus}</p>}
                {modifiable ? (
                  <>
                    <Formulaire action={modifierJoueur}>
                      <input type="hidden" name="id" value={j.id} />
                      <ChampsJoueur j={j} />
                    </Formulaire>
                    <Formulaire action={supprimerJoueur} bouton="Retirer ce joueur" className="form-row" confirmer={`Retirer ${j.prenoms} ${j.nom} ?`}>
                      <input type="hidden" name="id" value={j.id} />
                    </Formulaire>
                  </>
                ) : (
                  <p className="small">
                    Né(e) le {new Date(`${j.date_naissance}T12:00:00Z`).toLocaleDateString("fr-FR")}{j.poste ? ` · ${j.poste}` : ""}{j.numero_maillot ? ` · n° ${j.numero_maillot}` : ""}.
                    {j.etat === "soumise" && " Le comité doit encore valider cette licence ; elle n'est plus modifiable entre-temps."}
                  </p>
                )}
              </details>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 6 }}>Encadrement du club</h3>
        <p className="small" style={{ marginBottom: 12 }}>
          Le président, le coach et son adjoint reçoivent chacun une carte avec QR code, comme les joueurs.
          Vous ajoutez le coach et l&apos;adjoint ; le comité valide leurs cartes. La fiche du président est tenue par le comité.
        </p>
        <div className="adm-list">
          <div className="adm-item">
            <b>{FONCTIONS.président}</b>{" "}
            {president ? (
              <>
                <span className="small">· {president.prenoms} {president.nom}</span>{" "}
                <span className={`pill ${president.valide ? "ok" : "warn"}`}>{president.valide ? "Carte validée" : "En attente du comité"}</span>
              </>
            ) : (
              <span className="small">· fiche pas encore créée par le comité</span>
            )}
          </div>
          {(["coach", "adjoint"] as const).map((f) => {
            const e = fiche(f);
            return (
              <details key={f} className="adm-item" open={!e}>
                <summary>
                  <b>{FONCTIONS[f]}</b>{" "}
                  {e ? (
                    <>
                      <span className="small">· {e.prenoms} {e.nom}</span>{" "}
                      <span className={`pill ${e.valide ? "ok" : "warn"}`}>{e.valide ? "Carte validée" : "En attente du comité"}</span>
                    </>
                  ) : (
                    <span className="small">· à ajouter</span>
                  )}
                </summary>
                {e?.valide ? (
                  <p className="small">Carte validée : pour la modifier, contactez le comité.</p>
                ) : (
                  <>
                    <Formulaire action={enregistrerEncadrant} bouton={e ? "Enregistrer" : `Ajouter le ${FONCTIONS[f].toLowerCase()}`}>
                      <input type="hidden" name="fonction" value={f} />
                      {e && <input type="hidden" name="id" value={e.id} />}
                      <label className="field">Nom<input name="nom" defaultValue={e?.nom} required maxLength={60} /></label>
                      <label className="field">Prénoms<input name="prenoms" defaultValue={e?.prenoms} required maxLength={80} /></label>
                      <label className="field">Téléphone<input name="telephone" type="tel" defaultValue={e?.telephone ?? ""} maxLength={20} /></label>
                    </Formulaire>
                    {e && (
                      <Formulaire action={retirerEncadrant} bouton="Retirer" className="form-row" confirmer={`Retirer ${e.prenoms} ${e.nom} ?`}>
                        <input type="hidden" name="id" value={e.id} />
                      </Formulaire>
                    )}
                  </>
                )}
              </details>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 6 }}>Cartes à imprimer</h3>
        <p className="small" style={{ marginBottom: 12 }}>
          {cartes ? `${cartes} carte${cartes > 1 ? "s" : ""} validée${cartes > 1 ? "s" : ""} (encadrement et joueurs), à imprimer au format carte bancaire.` : "Les cartes apparaîtront dès que le comité aura validé l'encadrement ou des licences."}
        </p>
        <Link className="btn line sm" href="/admin/cartes">Voir et imprimer les cartes</Link>
      </div>
    </>
  );
}
