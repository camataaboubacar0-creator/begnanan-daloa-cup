import { headers } from "next/headers";
import { Formulaire } from "@/components/admin/Formulaire";
import { CarteLicence } from "@/components/licence/CarteLicence";
import { exigerAcces } from "@/lib/auth";
import { fcfa } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { EtatLicence, Joueur } from "@/lib/types";
import { ajouterJoueur, modifierJoueur, supprimerJoueur } from "./actions";

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
  const [{ data: club }, { data: t }, { data: joueurs }] = await Promise.all([
    db.from("clubs").select("nom").eq("id", orga.club_id!).single(),
    db.from("tournoi").select("licences_incluses, tarif_licence_fcfa").eq("id", 1).single(),
    db.from("joueurs").select("*").order("nom"),
  ]);
  const liste = (joueurs ?? []) as Joueur[];
  const incluses = t?.licences_incluses ?? 10;
  const tarif = t?.tarif_licence_fcfa ?? null;
  const demandees = liste.filter((j) => j.etat === "soumise" || j.etat === "active");
  const payantes = demandees.filter((j) => j.payante);
  const actives = liste.filter((j) => j.etat === "active");
  const h = await headers();
  const base = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

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

      {actives.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Cartes de licence</h3>
          <p className="small" style={{ marginBottom: 12 }}>À montrer à l&apos;entrée du terrain : le QR code permet au comité de vérifier la licence.</p>
          <div className="grid g2">
            {actives.map((j) => <CarteLicence key={j.id} joueur={j} club={club?.nom ?? ""} base={base} />)}
          </div>
        </div>
      )}
    </>
  );
}
