import { Formulaire } from "@/components/admin/Formulaire";
import { exigerAcces } from "@/lib/auth";
import { dateCourte, fcfa } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Club, StatutTransfert, Transfert } from "@/lib/types";
import { demanderTransfert, disqualifierClub, ouvrirMercato, repondreTransfert, validerTransfert } from "./actions";

const TONS: Record<StatutTransfert, string> = { demandé: "warn", "accepté par le club": "info", validé: "ok", refusé: "bad" };

const REGLES = (
  <ul className="etapes small" style={{ marginBottom: 12 }}>
    <li>Le club acheteur demande un joueur avec son numéro de licence (inscrit sur sa carte).</li>
    <li>Le club du joueur donne son accord, puis le comité valide : le joueur rejoint alors son nouveau club.</li>
    <li>Un joueur ne peut être transféré qu&apos;une seule fois : même si son nouveau club est disqualifié, aucun autre club ne pourra le recruter.</li>
    <li>Si le club d&apos;un joueur est disqualifié, le comité peut valider son transfert sans l&apos;accord de ce club.</li>
  </ul>
);

export default async function Mercato() {
  const orga = await exigerAcces("mercato");
  const db = await createClient();
  const [{ data: t }, { data: clubs }, { data: transferts }] = await Promise.all([
    db.from("tournoi").select("mercato_ouvert").eq("id", 1).single(),
    db.from("clubs").select("id, nom, disqualifie").order("nom"),
    db.from("transferts").select("*").order("cree_le", { ascending: false }),
  ]);
  const ouvert = Boolean(t?.mercato_ouvert);
  const listeClubs = (clubs ?? []) as Pick<Club, "id" | "nom" | "disqualifie">[];
  const club = new Map(listeClubs.map((c) => [c.id, c]));
  const liste = (transferts ?? []) as Transfert[];
  const ligne = (x: Transfert) => (
    <>
      <b>{x.joueur}</b> <span className="small mono">{x.numero_licence}</span>{" "}
      <span className={`pill ${TONS[x.statut]}`}>{x.statut}</span>
      <p className="small" style={{ margin: "4px 0" }}>
        {club.get(x.club_depart)?.nom ?? "?"}{club.get(x.club_depart)?.disqualifie ? " (disqualifié)" : ""} → {club.get(x.club_arrivee)?.nom ?? "?"}
        {x.montant_fcfa !== null && ` · ${fcfa(x.montant_fcfa)}`} · demandé le {dateCourte(x.cree_le.slice(0, 10))}
      </p>
    </>
  );

  if (orga.role === "president") {
    const recues = liste.filter((x) => x.club_depart === orga.club_id && x.statut === "demandé");
    const autres = liste.filter((x) => !recues.includes(x));
    return (
      <>
        <div className="card">
          <h3 style={{ marginBottom: 6 }}>Mercato <span className={`pill ${ouvert ? "ok" : "bad"}`}>{ouvert ? "Ouvert" : "Fermé"}</span></h3>
          {REGLES}
          {ouvert ? (
            <Formulaire action={demanderTransfert} bouton="Demander le transfert">
              <label className="field">Numéro de licence ou nom du joueur<input name="numero" required placeholder="BDC-26-0001 ou Issa Bamba" maxLength={80} /></label>
              <label className="field">Montant proposé (FCFA, facultatif)<input name="montant" type="number" min={0} step={500} /></label>
            </Formulaire>
          ) : (
            <p className="small">Le mercato est fermé : le comité annoncera la période des transferts.</p>
          )}
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Demandes reçues ({recues.length})</h3>
          {!recues.length && <p className="small">Aucun club ne demande vos joueurs pour l&apos;instant.</p>}
          <div className="adm-list">
            {recues.map((x) => (
              <div key={x.id} className="adm-item">
                {ligne(x)}
                <div className="form-row">
                  <Formulaire action={repondreTransfert} bouton="Accepter" className="form-row" confirmer={`Laisser partir ${x.joueur} ? Le comité devra encore valider.`}>
                    <input type="hidden" name="id" value={x.id} /><input type="hidden" name="reponse" value="oui" />
                  </Formulaire>
                  <Formulaire action={repondreTransfert} bouton="Refuser" className="form-row">
                    <input type="hidden" name="id" value={x.id} /><input type="hidden" name="reponse" value="non" />
                  </Formulaire>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Historique</h3>
          {!autres.length && <p className="small">Aucun transfert.</p>}
          <div className="adm-list">{autres.map((x) => <div key={x.id} className="adm-item">{ligne(x)}</div>)}</div>
        </div>
      </>
    );
  }

  const aValider = liste.filter((x) => x.statut === "demandé" || x.statut === "accepté par le club");
  const traites = liste.filter((x) => !aValider.includes(x));
  return (
    <>
      <div className="card">
        <h3 style={{ marginBottom: 6 }}>Mercato <span className={`pill ${ouvert ? "ok" : "bad"}`}>{ouvert ? "Ouvert" : "Fermé"}</span></h3>
        {REGLES}
        <Formulaire action={ouvrirMercato} className="form-row">
          <label className="chk"><input name="mercato_ouvert" type="checkbox" defaultChecked={ouvert} /> Mercato ouvert (les présidents peuvent demander des transferts)</label>
        </Formulaire>
        <p className="small" style={{ marginTop: 8 }}>Dates du mercato : <span className="tbc">à confirmer</span> par le comité.</p>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Transferts à valider ({aValider.length})</h3>
        {!aValider.length && <p className="small">Aucune demande en cours.</p>}
        <div className="adm-list">
          {aValider.map((x) => {
            const sansAccord = x.statut === "demandé" && !club.get(x.club_depart)?.disqualifie;
            return (
              <div key={x.id} className="adm-item">
                {ligne(x)}
                {sansAccord && <p className="small">En attente de l&apos;accord du club du joueur.</p>}
                <div className="form-row">
                  {!sansAccord && (
                    <Formulaire action={validerTransfert} bouton="Valider le transfert" className="form-row" confirmer={`Valider le transfert de ${x.joueur} ? Il sera définitif.`}>
                      <input type="hidden" name="id" value={x.id} /><input type="hidden" name="decision" value="oui" />
                    </Formulaire>
                  )}
                  <Formulaire action={validerTransfert} bouton="Refuser" className="form-row">
                    <input type="hidden" name="id" value={x.id} /><input type="hidden" name="decision" value="non" />
                  </Formulaire>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 6 }}>Clubs disqualifiés</h3>
        <p className="small" style={{ marginBottom: 12 }}>Un club disqualifié ne peut plus recruter, et ses joueurs (jamais transférés) peuvent rejoindre un autre club sans son accord.</p>
        <details open={listeClubs.some((c) => c.disqualifie)}>
          <summary className="small">{listeClubs.filter((c) => c.disqualifie).length} club(s) disqualifié(s) · gérer</summary>
        <div className="adm-list" style={{ marginTop: 8 }}>
          {listeClubs.map((c) => (
            <div key={c.id} className="adm-item" style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span><b>{c.nom}</b> {c.disqualifie && <span className="pill bad">Disqualifié</span>}</span>
              <Formulaire action={disqualifierClub} bouton={c.disqualifie ? "Réintégrer" : "Disqualifier"} className="form-row" confirmer={c.disqualifie ? undefined : `Disqualifier ${c.nom} ?`}>
                <input type="hidden" name="id" value={c.id} />
                {!c.disqualifie && <input type="hidden" name="disqualifie" value="on" />}
              </Formulaire>
            </div>
          ))}
        </div>
        </details>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Historique ({traites.length})</h3>
        {!traites.length && <p className="small">Aucun transfert traité.</p>}
        <div className="adm-list">{traites.map((x) => <div key={x.id} className="adm-item">{ligne(x)}</div>)}</div>
      </div>
    </>
  );
}
