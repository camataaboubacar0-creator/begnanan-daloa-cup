import { Formulaire } from "@/components/admin/Formulaire";
import { exigerAcces } from "@/lib/auth";
import { supplementLicences } from "@/lib/classement";
import { dateCourte, fcfa, whatsAppNumero } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { FONCTIONS, type Club, type DemandeClub, type Encadrant, type Joueur } from "@/lib/types";
import { accepterDemande, controlerLicence, enregistrerPresident, refuserDemande, refuserLicence, reglerLicences, validerEncadrant } from "./actions";

const age = (naissance: string) => Math.floor((Date.now() - new Date(naissance).getTime()) / (365.25 * 24 * 3600 * 1000));

export default async function AdminLicences() {
  await exigerAcces("licences");
  const db = await createClient();
  const [{ data: t }, { data: demandes }, { data: joueurs }, { data: clubs }, { data: encadrants }] = await Promise.all([
    db.from("tournoi").select("licences_incluses, tarif_licence_fcfa").eq("id", 1).single(),
    db.from("demandes_club").select("*").eq("statut", "en attente").order("cree_le"),
    db.from("joueurs").select("*").in("etat", ["soumise", "active"]).order("soumise_le"),
    db.from("clubs").select("id, nom").order("nom"),
    db.from("encadrants").select("*").order("cree_le"),
  ]);
  const staff = (encadrants ?? []) as Encadrant[];
  const staffAValider = staff.filter((e) => !e.valide);
  const presidents = new Map(staff.filter((e) => e.fonction === "président").map((e) => [e.club_id, e]));
  const incluses = t?.licences_incluses ?? 10;
  const tarif = t?.tarif_licence_fcfa ?? null;
  const liste = (joueurs ?? []) as Joueur[];
  const aControler = liste.filter((j) => j.etat === "soumise");
  const nomClub = new Map(((clubs ?? []) as Pick<Club, "id" | "nom">[]).map((c) => [c.id, c.nom]));
  const parClub = [...nomClub].map(([id, nom]) => {
    const js = liste.filter((j) => j.club_id === id);
    const payantes = js.filter((j) => j.payante);
    return {
      id,
      nom,
      actives: js.filter((j) => j.etat === "active").length,
      enAttente: js.filter((j) => j.etat === "soumise").length,
      du: supplementLicences(incluses + payantes.length, tarif).montant,
      paye: tarif === null ? null : payantes.filter((j) => j.paiement_recu).length * tarif,
    };
  }).filter((c) => c.actives + c.enAttente > 0);

  return (
    <>
      <div className="card">
        <h3 style={{ marginBottom: 6 }}>Règles des licences</h3>
        <p className="small" style={{ marginBottom: 12 }}>
          Une licence devient active quand la validation sportive est cochée et, si elle est payante, quand le paiement est reçu.
          Tant que le tarif est vide, les clubs ne peuvent pas demander de licence au-delà du quota.
        </p>
        <Formulaire action={reglerLicences}>
          <label className="field">Licences incluses par club<input name="licences_incluses" type="number" min={0} max={60} defaultValue={incluses} required /></label>
          <label className="field">Tarif par licence supplémentaire (FCFA)<input name="tarif_licence_fcfa" type="number" min={0} step={100} defaultValue={tarif ?? ""} placeholder="À fixer" /></label>
        </Formulaire>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Demandes d&apos;inscription ({demandes?.length ?? 0})</h3>
        {!demandes?.length && <p className="small">Aucune demande en attente. Les présidents déposent leur demande sur la page « Inscrire mon club ».</p>}
        <div className="adm-list">
          {((demandes ?? []) as DemandeClub[]).map((d) => (
            <div key={d.id} className="adm-item">
              <b>{d.nom_club}</b>{d.quartier && <span className="small"> · {d.quartier}</span>}
              <p className="small" style={{ margin: "4px 0" }}>
                {d.president_nom} · <a href={whatsAppNumero(d.telephone)} target="_blank" rel="noopener">{d.telephone}</a> · {d.email} · reçue le {dateCourte(d.cree_le.slice(0, 10))}
              </p>
              {d.message && <p className="small" style={{ fontStyle: "italic" }}>« {d.message} »</p>}
              <div className="form-row">
                <Formulaire action={accepterDemande} bouton="Accepter et créer le compte" className="form-row">
                  <input type="hidden" name="id" value={d.id} />
                </Formulaire>
                <Formulaire action={refuserDemande} bouton="Refuser" className="form-row" confirmer={`Refuser la demande de ${d.nom_club} ?`}>
                  <input type="hidden" name="id" value={d.id} />
                </Formulaire>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Licences à contrôler ({aControler.length})</h3>
        {!aControler.length && <p className="small">Aucune demande de licence en attente.</p>}
        <div className="adm-list">
          {aControler.map((j) => (
            <div key={j.id} className="adm-item">
              <b>{j.prenoms} {j.nom}</b>{" "}
              <span className="small">· {nomClub.get(j.club_id)} · {age(j.date_naissance)} ans{j.poste ? ` · ${j.poste}` : ""}{j.numero_maillot ? ` · n° ${j.numero_maillot}` : ""}</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "6px 0" }}>
                {j.payante ? <span className="pill warn">Payante{tarif !== null ? ` · ${fcfa(tarif)}` : ""}</span> : <span className="pill ok">Incluse</span>}
                {j.doublon_possible && <span className="pill bad">Doublon possible : même joueur dans un autre club</span>}
              </div>
              <Formulaire action={controlerLicence} className="form-row">
                <input type="hidden" name="id" value={j.id} />
                <label className="chk"><input name="validation_sportive" type="checkbox" defaultChecked={j.validation_sportive} /> Validation sportive</label>
                {j.payante && <label className="chk"><input name="paiement_recu" type="checkbox" defaultChecked={j.paiement_recu} /> Paiement reçu</label>}
              </Formulaire>
              <details style={{ marginTop: 6 }}>
                <summary className="small">Refuser cette licence</summary>
                <Formulaire action={refuserLicence} bouton="Refuser" className="form-row">
                  <input type="hidden" name="id" value={j.id} />
                  <label className="field">Motif (visible par le président)<input name="motif" required maxLength={300} /></label>
                </Formulaire>
              </details>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 6 }}>Encadrement des clubs</h3>
        <p className="small" style={{ marginBottom: 12 }}>
          Chaque club a trois cartes d&apos;encadrement : le président, le coach et l&apos;adjoint. Les présidents ajoutent leur coach et leur adjoint ;
          vous validez leurs cartes ici. La carte du président est créée à l&apos;acceptation de la demande.
        </p>
        {!staffAValider.length && <p className="small" style={{ marginBottom: 12 }}>Aucune carte d&apos;encadrement à valider.</p>}
        <div className="adm-list">
          {staffAValider.map((e) => (
            <div key={e.id} className="adm-item">
              <b>{e.prenoms} {e.nom}</b> <span className="small">· {FONCTIONS[e.fonction]} · {nomClub.get(e.club_id)}{e.telephone ? ` · ${e.telephone}` : ""}</span>
              <Formulaire action={validerEncadrant} className="form-row" bouton="Valider la carte">
                <input type="hidden" name="id" value={e.id} />
                <input type="hidden" name="valide" value="on" />
              </Formulaire>
            </div>
          ))}
        </div>
        <details style={{ marginTop: 12 }}>
          <summary className="small">Fiches des présidents ({presidents.size} / {nomClub.size} clubs)</summary>
          <div className="adm-list" style={{ marginTop: 8 }}>
            {[...nomClub].map(([id, nom]) => {
              const p = presidents.get(id);
              return (
                <details key={id} className="adm-item">
                  <summary><b>{nom}</b> <span className="small">· {p ? `${p.prenoms} ${p.nom}${p.numero_carte ? ` · ${p.numero_carte}` : ""}` : "pas de fiche"}</span></summary>
                  <Formulaire action={enregistrerPresident}>
                    <input type="hidden" name="club_id" value={id} />
                    <label className="field">Nom<input name="nom" defaultValue={p?.nom} required maxLength={60} /></label>
                    <label className="field">Prénoms<input name="prenoms" defaultValue={p?.prenoms} required maxLength={80} /></label>
                    <label className="field">Téléphone<input name="telephone" type="tel" defaultValue={p?.telephone ?? ""} maxLength={20} /></label>
                  </Formulaire>
                </details>
              );
            })}
          </div>
        </details>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Par club</h3>
        {!parClub.length ? (
          <p className="small">Aucune licence demandée pour l&apos;instant.</p>
        ) : (
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Club</th><th>Actives</th><th>En attente</th><th>Dû</th><th>Payé</th></tr></thead>
              <tbody>
                {parClub.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nom}</td><td>{c.actives}</td><td>{c.enAttente}</td>
                    <td>{c.du === null ? "Tarif à fixer" : fcfa(c.du)}</td><td>{c.paye === null ? "—" : fcfa(c.paye)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
