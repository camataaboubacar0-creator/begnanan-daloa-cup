import { Formulaire } from "@/components/admin/Formulaire";
import { exigerAcces } from "@/lib/auth";
import { heure, jourCourt, lienWhatsApp, numeroInternational, whatsAppNumero } from "@/lib/format";
import { adresseDuSite } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { TYPES_ALERTE, type Alerte, type Club, type Match } from "@/lib/types";
import { envoiAutomatique, texteAlerte } from "@/lib/whatsapp";
import { envoyerAnnonce, publierAnnonce, supprimerAnnonce } from "./actions";

const TONS: Record<Alerte["type"], string> = { info: "info", incident: "bad", annulation: "bad", report: "warn", calendrier: "ok" };

export default async function Annonces() {
  await exigerAcces("annonces");
  const db = await createClient();
  const [{ data: alertes }, { data: abonnes }, { data: matchs }, { data: clubs }] = await Promise.all([
    db.from("alertes").select("*").order("publiee_le", { ascending: false }).limit(40),
    db.from("abonnes_alertes").select("nom, telephone").order("cree_le"),
    db.from("matchs").select("id, club_domicile, club_exterieur, date_heure").in("statut", ["programmé", "en cours", "reporté", "interrompu"]).order("date_heure"),
    db.from("clubs").select("id, nom"),
  ]);
  const nom = new Map(((clubs ?? []) as Pick<Club, "id" | "nom">[]).map((c) => [c.id, c.nom]));
  const liste = (alertes ?? []) as Alerte[];
  const numeros = (abonnes ?? []) as { nom: string | null; telephone: string }[];
  const site = `${await adresseDuSite()}/infos`;

  return (
    <>
      <div className="card">
        <h3 style={{ marginBottom: 6 }}>Publier une annonce</h3>
        <p className="small" style={{ marginBottom: 12 }}>
          Incident, match annulé ou reporté, changement d&apos;horaire… L&apos;annonce s&apos;affiche aussitôt sur l&apos;accueil et dans Infos pratiques.
          Quand vous passez un match en « annulé », « reporté » ou « interrompu », l&apos;annonce est créée toute seule.
        </p>
        <Formulaire action={publierAnnonce} bouton="Publier">
          <label className="field">Type
            <select name="type" defaultValue="info">
              {Object.entries(TYPES_ALERTE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className="field">Match concerné (facultatif)
            <select name="match_id" defaultValue="">
              <option value="">—</option>
              {((matchs ?? []) as Pick<Match, "id" | "club_domicile" | "club_exterieur" | "date_heure">[]).map((m) => (
                <option key={m.id} value={m.id}>{nom.get(m.club_domicile)} – {nom.get(m.club_exterieur)} · {jourCourt(m.date_heure)} {heure(m.date_heure)}</option>
              ))}
            </select>
          </label>
          <label className="field full">Titre<input name="titre" required maxLength={120} placeholder="Ex. : Match reporté à cause de la pluie" /></label>
          <label className="field full">Détails<textarea name="texte" rows={3} maxLength={1000} /></label>
          {envoiAutomatique && <label className="chk"><input name="whatsapp" type="checkbox" defaultChecked /> Envoyer aussi sur WhatsApp aux {numeros.length} abonnés</label>}
        </Formulaire>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 6 }}>Abonnés WhatsApp ({numeros.length})</h3>
        {envoiAutomatique ? (
          <p className="small">L&apos;envoi automatique est actif : chaque annonce peut partir directement sur le WhatsApp des abonnés.</p>
        ) : (
          <p className="small">
            L&apos;envoi automatique n&apos;est pas encore branché (il faut un compte WhatsApp Business de Meta <span className="tbc">à confirmer</span>).
            En attendant, utilisez « Partager sur WhatsApp » sur une annonce pour l&apos;envoyer dans votre groupe, votre chaîne ou votre liste de diffusion
            WhatsApp ; les numéros ci-dessous servent à créer cette liste.
          </p>
        )}
        {numeros.length > 0 && (
          <details style={{ marginTop: 10 }}>
            <summary className="small">Voir les numéros</summary>
            <textarea readOnly rows={3} style={{ width: "100%", marginTop: 8 }} value={numeros.map((n) => `+${numeroInternational(n.telephone)}`).join(", ")} aria-label="Numéros des abonnés" />
            <ul className="small" style={{ margin: "8px 0 0", paddingLeft: 18 }}>
              {numeros.map((n) => <li key={n.telephone}>{n.nom ?? "Sans nom"} · <a href={whatsAppNumero(n.telephone)} target="_blank" rel="noopener">{n.telephone}</a></li>)}
            </ul>
          </details>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Annonces publiées ({liste.length})</h3>
        {!liste.length && <p className="small">Aucune annonce pour l&apos;instant.</p>}
        <div className="adm-list">
          {liste.map((a) => (
            <div key={a.id} className="adm-item">
              <span className={`pill ${TONS[a.type]}`}>{TYPES_ALERTE[a.type]}</span> <b>{a.titre}</b>
              <p className="small" style={{ margin: "4px 0" }}>
                {a.texte && <>{a.texte}<br /></>}
                Publiée le {jourCourt(a.publiee_le)} à {heure(a.publiee_le)}
                {a.envoyee_le ? ` · envoyée sur WhatsApp le ${jourCourt(a.envoyee_le)} à ${heure(a.envoyee_le)}` : ""}
              </p>
              <div className="form-row">
                <a className="btn line sm" href={lienWhatsApp(texteAlerte(a, site))} target="_blank" rel="noopener">Partager sur WhatsApp</a>
                {envoiAutomatique && !a.envoyee_le && (
                  <Formulaire action={envoyerAnnonce} bouton={`Envoyer aux ${numeros.length} abonnés`} className="form-row">
                    <input type="hidden" name="id" value={a.id} />
                  </Formulaire>
                )}
                <Formulaire action={supprimerAnnonce} bouton="Retirer du site" className="form-row" confirmer="Retirer cette annonce du site ?">
                  <input type="hidden" name="id" value={a.id} />
                </Formulaire>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
