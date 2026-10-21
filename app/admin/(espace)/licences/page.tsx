import { ChampPhoto } from "@/components/ChampPhoto";
import { Formulaire } from "@/components/admin/Formulaire";
import { exigerAcces } from "@/lib/auth";
import { supplementLicences } from "@/lib/classement";
import { dateCourte, fcfa, whatsAppNumero } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { FONCTIONS, type Club, type DemandeClub, type Encadrant, type Joueur, type ModificationClub } from "@/lib/types";
import { accepterDemande, controlerLicence, enregistrerPresident, refuserDemande, refuserLicence, reglerLicences, traiterModification, validerEncadrant } from "./actions";

const age = (naissance: string) => Math.floor((Date.now() - new Date(naissance).getTime()) / (365.25 * 24 * 3600 * 1000));

const CHAMPS: Record<string, string> = {
  logo_url: "Logo", photo_url: "Photo", couleur: "Couleur", quartier: "Quartier", presentation: "Présentation",
  nom: "Nom", prenoms: "Prénoms", date_naissance: "Naissance", poste: "Poste", numero_maillot: "Maillot", telephone: "Téléphone",
};

/** Valeurs proposées par le club qui diffèrent de la fiche actuelle. */
function Changements({ avant, apres }: { avant?: Record<string, unknown>; apres: Record<string, unknown> }) {
  const lignes = Object.entries(apres).filter(([k, v]) => k in CHAMPS && (v ?? "") !== (avant?.[k] ?? ""));
  if (!lignes.length) return <p className="small">Aucun changement par rapport à la fiche actuelle.</p>;
  const valeur = (k: string, v: unknown) =>
    k.endsWith("_url") ? (v ? <img className="vignette" src={String(v)} alt="" /> : "—") : k === "couleur" ? <span className="pastille" style={{ background: String(v) }} /> : String(v ?? "") || "—";
  return (
    <ul className="liste-demande">
      {lignes.map(([k, v]) => (
        <li key={k}>{CHAMPS[k]} : {valeur(k, avant?.[k])} → <b>{valeur(k, v)}</b></li>
      ))}
    </ul>
  );
}

export default async function AdminLicences() {
  await exigerAcces("licences");
  const db = await createClient();
  const [{ data: t }, { data: demandes }, { data: joueurs }, { data: clubs }, { data: encadrants }, { data: modifs }] = await Promise.all([
    db.from("tournoi").select("licences_incluses, tarif_licence_fcfa").eq("id", 1).single(),
    db.from("demandes_club").select("*").eq("statut", "en attente").order("cree_le"),
    db.from("joueurs").select("*").in("etat", ["soumise", "active"]).order("soumise_le"),
    db.from("clubs").select("id, nom, logo_url, couleur, quartier, presentation").order("nom"),
    db.from("encadrants").select("*").order("cree_le"),
    db.from("modifications_club").select("*").eq("statut", "en attente").order("cree_le"),
  ]);
  const modifications = (modifs ?? []) as ModificationClub[];
  const fichesClubs = new Map(((clubs ?? []) as Club[]).map((c) => [c.id, c]));
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {d.logo_url && <img className="vignette" src={d.logo_url} alt="" />}
              <b>{d.nom_club}</b>{d.quartier && <span className="small"> · {d.quartier}</span>}
              <p className="small" style={{ margin: "4px 0" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {d.president_photo_url && <img className="vignette" src={d.president_photo_url} alt="" />}
                {[d.president_prenoms, d.president_nom].filter(Boolean).join(" ")} · <a href={whatsAppNumero(d.telephone)} target="_blank" rel="noopener">{d.telephone}</a> · identifiant : {d.identifiant ?? d.email} · reçue le {dateCourte(d.cree_le.slice(0, 10))}
              </p>
              {d.message && <p className="small" style={{ fontStyle: "italic" }}>« {d.message} »</p>}
              {(d.encadrement?.length || d.joueurs?.length) ? (
                <details style={{ margin: "6px 0" }}>
                  <summary className="small">Encadrement ({d.encadrement?.length ?? 0}) et joueurs ({d.joueurs?.length ?? 0})</summary>
                  <ul className="small liste-demande">
                    {(d.encadrement ?? []).map((e) => (
                      <li key={e.fonction}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {e.photo_url ? <img className="vignette" src={e.photo_url} alt="" /> : <span className="vignette" />}
                        <b>{FONCTIONS[e.fonction]}</b> : {e.prenoms} {e.nom}{e.telephone ? ` · ${e.telephone}` : ""}
                      </li>
                    ))}
                    {(d.joueurs ?? []).map((j, i) => (
                      <li key={i}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {j.photo_url ? <img className="vignette" src={j.photo_url} alt="" /> : <span className="vignette" />}
                        {j.prenoms} {j.nom} · {age(j.date_naissance)} ans{j.poste ? ` · ${j.poste}` : ""}{j.numero_maillot ? ` · n° ${j.numero_maillot}` : ""}
                      </li>
                    ))}
                  </ul>
                  <p className="small">En acceptant, l&apos;encadrement reçoit ses cartes et les licences des joueurs passent dans « Licences à contrôler ».</p>
                </details>
              ) : null}
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
        <h3 style={{ marginBottom: 6 }}>Modifications demandées par les clubs ({modifications.length})</h3>
        <p className="small" style={{ marginBottom: 12 }}>
          Depuis leur espace club, les présidents proposent les changements de profil, de licences et de cartes validées, ou un retrait.
          Rien n&apos;est appliqué tant qu&apos;un membre du comité n&apos;a pas accepté.
        </p>
        {!modifications.length && <p className="small">Aucune demande en attente.</p>}
        <div className="adm-list">
          {modifications.map((m) => {
            const avant = (m.objet === "profil" ? fichesClubs.get(m.club_id) : m.objet === "joueur" ? liste.find((j) => j.id === m.cible) : staff.find((e) => e.id === m.cible)) as
              | Record<string, unknown>
              | undefined;
            return (
              <div key={m.id} className="adm-item">
                <b>{nomClub.get(m.club_id)} · {m.action === "retirer" ? "Retrait" : "Modification"} {m.objet === "profil" ? "du profil" : m.objet === "joueur" ? "d'un joueur" : "de l'encadrement"}{m.libelle ? ` · ${m.libelle}` : ""}</b>
                <span className="small"> · {dateCourte(m.cree_le.slice(0, 10))}</span>
                {!avant && m.objet !== "profil" && <p className="small">Cet élément n&apos;existe plus.</p>}
                {m.action === "modifier" && <Changements avant={avant} apres={m.donnees} />}
                <Formulaire action={traiterModification} bouton="Valider la décision" className="form-row">
                  <input type="hidden" name="id" value={m.id} />
                  <label className="field">Décision
                    <select name="decision" defaultValue="accepter">
                      <option value="accepter">Accepter et appliquer</option>
                      <option value="refuser">Refuser</option>
                    </select>
                  </label>
                  <label className="field">Motif (si refus)<input name="motif" maxLength={300} /></label>
                </Formulaire>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Licences à contrôler ({aControler.length})</h3>
        {!aControler.length && <p className="small">Aucune demande de licence en attente.</p>}
        <div className="adm-list">
          {aControler.map((j) => (
            <div key={j.id} className="adm-item">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {j.photo_url ? <img className="vignette" src={j.photo_url} alt="" /> : <span className="pill bad" style={{ marginRight: 6 }}>Sans photo</span>}
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {e.photo_url ? <img className="vignette" src={e.photo_url} alt="" /> : <span className="pill bad" style={{ marginRight: 6 }}>Sans photo</span>}
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
                    <ChampPhoto name="photo" label="Photo" actuelle={p?.photo_url} />
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
