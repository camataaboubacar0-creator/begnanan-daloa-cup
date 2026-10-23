import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChronoPublic } from "@/components/ChronoMatch";
import { Crest } from "@/components/Crest";
import { StatutPill } from "@/components/StatutMatch";
import { TirsAuBut } from "@/components/TirsAuBut";
import { getClubs, getEvenements, getMatchs, getTirsAuBut, getTournoi, parId } from "@/lib/data";
import { heure, jourCourt, lienWhatsApp } from "@/lib/format";
import { EVENEMENTS } from "@/lib/types";
import { Actualisation } from "./Actualisation";

export const revalidate = 15;


async function charger(id: string) {
  const [matchs, clubs] = await Promise.all([getMatchs(), getClubs()]);
  const match = matchs.find((m) => m.id === id);
  return match ? { match, clubs: parId(clubs) } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const d = await charger((await params).id);
  if (!d) return {};
  return { title: `${d.clubs.get(d.match.club_domicile)?.nom ?? "?"} – ${d.clubs.get(d.match.club_exterieur)?.nom ?? "?"}` };
}

/** Page d'un match : score, buts et cartons ; se met à jour toute seule pendant le match. */
export default async function PageMatch({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await charger(id);
  if (!d) notFound();
  const { match, clubs } = d;
  const [evenements, tirs, tournoi] = await Promise.all([getEvenements(id), getTirsAuBut(id), getTournoi()]);
  const durees = { mi_temps: tournoi.duree_mi_temps ?? null, prolongation: tournoi.duree_prolongation ?? null };
  const dom = clubs.get(match.club_domicile);
  const ext = clubs.get(match.club_exterieur);
  const score = match.statut === "en cours" || match.statut === "terminé";
  const titre = `${dom?.nom ?? "?"} – ${ext?.nom ?? "?"}`;

  return (
    <section className="band">
      <div className="wrap" style={{ maxWidth: 720 }}>
        <Link className="small" href="/matchs">← Tous les matchs</Link>
        <div className="card match-direct">
          <div className="eyebrow">{match.poule ? `Poule ${match.poule}` : match.phase} · {jourCourt(match.date_heure)} à {heure(match.date_heure)} · {match.terrain}</div>
          <div className="match-direct-score">
            <div><Crest club={dom} size="crest" /><b>{dom?.nom}</b></div>
            <h1 className="num">{score ? `${match.buts_domicile ?? 0} – ${match.buts_exterieur ?? 0}` : heure(match.date_heure)}</h1>
            <div><Crest club={ext} size="crest" /><b>{ext?.nom}</b></div>
          </div>
          {match.tab_domicile != null && <p className="match-tab">Tirs au but : <b className="num">{match.tab_domicile} – {match.tab_exterieur}</b></p>}
          {match.statut === "en cours" && match.periode && <p className="match-tab"><ChronoPublic chrono={match} durees={durees} /></p>}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
            <StatutPill statut={match.statut} />
            {match.statut === "terminé" && !match.resultat_valide && <span className="small">Résultat provisoire</span>}
            {match.statut === "en cours" && <Actualisation />}
          </div>
        </div>

        {tirs.length > 0 && (
          <div className="card">
            <h2 style={{ fontSize: "1.35rem", marginBottom: 10 }}>Tirs au but</h2>
            <TirsAuBut tirs={tirs} equipes={[{ id: match.club_domicile, nom: dom?.nom ?? "?" }, { id: match.club_exterieur, nom: ext?.nom ?? "?" }]} tireurs={tournoi.tab_tireurs ?? 3} />
          </div>
        )}

        <div className="card">
          <h2 style={{ fontSize: "1.35rem", marginBottom: 10 }}>Déroulé du match</h2>
          {evenements.length ? (
            <ol className="deroule">
              {evenements.map((e) => (
                <li key={e.id} className={e.club_id === match.club_domicile ? "dom" : "ext"}>
                  <span className="num">{e.minute !== null ? `${e.minute}'` : ""}</span>
                  <span>{EVENEMENTS[e.type].icone} {EVENEMENTS[e.type].libelle}{e.joueur_nom ? ` · ${e.joueur_nom}` : ""}</span>
                  <span className="small">{clubs.get(e.club_id)?.sigle}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="small">{score ? "Aucun but ni carton pour l'instant." : "Le déroulé s'affichera ici pendant le match."}</p>
          )}
        </div>
        <a className="btn line sm" href={lienWhatsApp(`${titre}${score ? ` : ${match.buts_domicile ?? 0}-${match.buts_exterieur ?? 0}${match.tab_domicile != null ? ` (${match.tab_domicile}-${match.tab_exterieur} aux tirs au but)` : ""}` : ""} · BÊGNANAN DALOA CUP`)} target="_blank" rel="noopener">Partager sur WhatsApp</a>
      </div>
    </section>
  );
}
