import { Formulaire } from "@/components/admin/Formulaire";
import { ChampPhoto } from "@/components/ChampPhoto";
import { exigerClub } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FONCTIONS, type Encadrant, type Fonction, type ModificationClub } from "@/lib/types";
import { demanderRetrait, enregistrerEncadrant, proposerEncadrant, retirerEncadrant } from "../actions";
import { DemandeEnAttente } from "../Demandes";

function ChampsEncadrant({ e }: { e?: Encadrant }) {
  return (
    <>
      <label className="field">Nom<input name="nom" defaultValue={e?.nom} required maxLength={60} /></label>
      <label className="field">Prénoms<input name="prenoms" defaultValue={e?.prenoms} required maxLength={80} /></label>
      <label className="field">Téléphone<input name="telephone" type="tel" defaultValue={e?.telephone ?? ""} maxLength={20} /></label>
      <ChampPhoto name="photo" label="Photo (pour la carte)" actuelle={e?.photo_url} />
    </>
  );
}

export default async function Encadrement() {
  const orga = await exigerClub();
  const db = await createClient();
  const [{ data: encadrants }, { data: demandes }] = await Promise.all([
    db.from("encadrants").select("*").eq("club_id", orga.club_id),
    db.from("modifications_club").select("*").eq("objet", "encadrant").eq("statut", "en attente"),
  ]);
  const staff = (encadrants ?? []) as Encadrant[];
  const attente = new Map(((demandes ?? []) as ModificationClub[]).map((d) => [d.cible, d]));

  return (
    <div className="card">
      <h3 style={{ marginBottom: 6 }}>Encadrement du club</h3>
      <p className="small" style={{ marginBottom: 12 }}>
        Le président, le coach et son adjoint reçoivent chacun une carte avec photo et QR code, comme les joueurs.
        Vous ajoutez le coach et l&apos;adjoint ; le comité valide leurs cartes. Une fois une carte validée, toute modification ou tout retrait est envoyé au comité.
      </p>
      <div className="adm-list">
        {(["président", "coach", "adjoint"] as Fonction[]).map((f) => {
          const e = staff.find((x) => x.fonction === f);
          const demande = e && attente.get(e.id);
          // La fiche du président est créée par le comité ; elle se modifie sur demande, comme une carte validée.
          const surDemande = e && (e.valide || f === "président");
          return (
            <details key={f} className="adm-item" open={!e && f !== "président"}>
              <summary>
                {e?.photo_url ? <img className="vignette" src={e.photo_url} alt="" /> : <span className="vignette" />}
                <b>{FONCTIONS[f]}</b>{" "}
                {e ? (
                  <>
                    <span className="small">· {e.prenoms} {e.nom}</span>{" "}
                    <span className={`pill ${e.valide ? "ok" : "warn"}`}>{e.valide ? "Carte validée" : "En attente du comité"}</span>
                    {demande && <span className="pill warn" style={{ marginLeft: 6 }}>Demande en cours</span>}
                  </>
                ) : (
                  <span className="small">· {f === "président" ? "fiche pas encore créée par le comité" : "à ajouter"}</span>
                )}
              </summary>
              {!e && f === "président" ? (
                <p className="small">Le comité crée la fiche du président à partir de la demande d&apos;inscription.</p>
              ) : demande ? (
                <DemandeEnAttente d={demande} />
              ) : surDemande ? (
                <>
                  <p className="small" style={{ margin: "8px 0" }}>Proposer une modification au comité :</p>
                  <Formulaire action={proposerEncadrant} bouton="Envoyer au comité">
                    <input type="hidden" name="id" value={e.id} />
                    <ChampsEncadrant e={e} />
                  </Formulaire>
                  {f !== "président" && (
                    <Formulaire action={demanderRetrait} bouton="Demander le retrait" className="form-row" confirmer={`Demander au comité de retirer ${e.prenoms} ${e.nom} ?`}>
                      <input type="hidden" name="objet" value="encadrant" />
                      <input type="hidden" name="id" value={e.id} />
                      <input type="hidden" name="libelle" value={`${FONCTIONS[f]} · ${e.prenoms} ${e.nom}`} />
                    </Formulaire>
                  )}
                </>
              ) : (
                <>
                  <Formulaire action={enregistrerEncadrant} bouton={e ? "Enregistrer" : `Ajouter le ${FONCTIONS[f].toLowerCase()}`}>
                    <input type="hidden" name="fonction" value={f} />
                    {e && <input type="hidden" name="id" value={e.id} />}
                    <ChampsEncadrant e={e} />
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
  );
}
