import Link from "next/link";
import { Formulaire } from "@/components/admin/Formulaire";
import { StatutPill } from "@/components/StatutMatch";
import { exigerAcces } from "@/lib/auth";
import { heure, jourCourt } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Club, EvenementMatch, Match } from "@/lib/types";
import { changerStatut, retirerEvenement } from "./actions";
import { SaisieEquipe } from "./Saisie";

const LIBELLES = { but: "⚽ But", csc: "⚽ But contre son camp", jaune: "🟨 Carton jaune", rouge: "🟥 Carton rouge" };

/** Match en direct : buts et cartons saisis depuis le téléphone, score mis à jour sur le site. */
export default async function Direct({ searchParams }: { searchParams: Promise<{ match?: string }> }) {
  await exigerAcces("direct");
  const db = await createClient();
  const [{ data: m }, { data: c }] = await Promise.all([
    db.from("matchs").select("*").in("statut", ["programmé", "en cours", "terminé"]).eq("resultat_valide", false).order("date_heure"),
    db.from("clubs").select("id, nom"),
  ]);
  const matchs = (m ?? []) as Match[];
  const clubs = new Map(((c ?? []) as Pick<Club, "id" | "nom">[]).map((x) => [x.id, x]));
  const nom = (id: string) => clubs.get(id)?.nom ?? "?";
  const demande = (await searchParams).match;
  const match = matchs.find((x) => x.id === demande) ?? matchs.find((x) => x.statut === "en cours") ?? matchs.find((x) => x.statut === "programmé");

  if (!match) {
    return (
      <div className="card">
        <h3 style={{ marginBottom: 6 }}>Match en direct</h3>
        <p className="small">Aucun match à suivre : ajoutez les matchs dans « Clubs et matchs ». Les matchs dont le résultat est validé n&apos;apparaissent plus ici.</p>
      </div>
    );
  }

  const [{ data: e }, { data: j }] = await Promise.all([
    db.from("evenements_match").select("*").eq("match_id", match.id).order("minute", { nullsFirst: false }).order("cree_le"),
    db.from("joueurs").select("id, nom, prenoms, numero_maillot, club_id").in("club_id", [match.club_domicile, match.club_exterieur]).eq("etat", "active").order("nom"),
  ]);
  const evenements = (e ?? []) as EvenementMatch[];
  const joueurs = (j ?? []) as { id: string; nom: string; prenoms: string; numero_maillot: number | null; club_id: string }[];
  const liste = (club: string) =>
    joueurs.filter((x) => x.club_id === club).map((x) => ({ id: x.id, nom: `${x.numero_maillot ? `${x.numero_maillot}. ` : ""}${x.prenoms} ${x.nom}` }));

  return (
    <>
      <div className="card">
        <form method="get" className="form-row" style={{ marginTop: 0 }}>
          <label className="field">Match
            <select name="match" defaultValue={match.id}>
              {matchs.map((x) => (
                <option key={x.id} value={x.id}>{jourCourt(x.date_heure)} {heure(x.date_heure)} · {nom(x.club_domicile)} – {nom(x.club_exterieur)} ({x.statut})</option>
              ))}
            </select>
          </label>
          <button className="btn line sm">Afficher</button>
        </form>
      </div>

      <div className="card direct-score">
        <StatutPill statut={match.statut} />
        <div className="direct-tableau">
          <span>{nom(match.club_domicile)}</span>
          <b className="num">{match.buts_domicile ?? 0} – {match.buts_exterieur ?? 0}</b>
          <span>{nom(match.club_exterieur)}</span>
        </div>
        <div className="form-row" style={{ justifyContent: "center" }}>
          {match.statut === "programmé" && (
            <Formulaire action={changerStatut} bouton="Coup d'envoi" className="form-row">
              <input type="hidden" name="match_id" value={match.id} />
              <input type="hidden" name="statut" value="en cours" />
            </Formulaire>
          )}
          {match.statut === "en cours" && (
            <Formulaire action={changerStatut} bouton="Fin du match" className="form-row" confirmer="Terminer le match ?">
              <input type="hidden" name="match_id" value={match.id} />
              <input type="hidden" name="statut" value="terminé" />
            </Formulaire>
          )}
          <Link className="btn line sm" href={`/matchs/${match.id}`} target="_blank">Voir la page publique</Link>
        </div>
        <p className="small" style={{ marginTop: 8 }}>
          Le score se calcule à partir des buts saisis ici. Le résultat devient officiel quand vous le validez dans « Clubs et matchs ».
        </p>
      </div>

      <div className="direct-equipes">
        <SaisieEquipe matchId={match.id} club={{ id: match.club_domicile, nom: nom(match.club_domicile) }} joueurs={liste(match.club_domicile)} />
        <SaisieEquipe matchId={match.id} club={{ id: match.club_exterieur, nom: nom(match.club_exterieur) }} joueurs={liste(match.club_exterieur)} />
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Déroulé ({evenements.length})</h3>
        {!evenements.length && <p className="small">Rien pour l&apos;instant.</p>}
        <div className="adm-list">
          {evenements.map((x) => (
            <div key={x.id} className="adm-item direct-ligne">
              <span className="num">{x.minute !== null ? `${x.minute}'` : "–"}</span>
              <span>{LIBELLES[x.type]} · <b>{x.joueur_nom ?? "joueur non précisé"}</b> <span className="small">({x.type === "csc" ? `compté pour ${nom(x.club_id)}` : nom(x.club_id)})</span></span>
              <Formulaire action={retirerEvenement} bouton="Annuler" className="form-row" confirmer="Annuler cette saisie ?">
                <input type="hidden" name="id" value={x.id} />
              </Formulaire>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
