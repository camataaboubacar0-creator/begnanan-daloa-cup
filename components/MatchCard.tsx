import Link from "next/link";
import type { Club, Match } from "@/lib/types";
import { heure, lienWhatsApp } from "@/lib/format";
import { Crest } from "./Crest";
import { StatutPill } from "./StatutMatch";

const TZ = "Africa/Abidjan";

export function MatchCard({ match, clubs }: { match: Match; clubs: Map<string, Club> }) {
  const dom = clubs.get(match.club_domicile);
  const ext = clubs.get(match.club_exterieur);
  const score = match.statut === "terminé" || match.statut === "en cours";
  const d = new Date(match.date_heure);
  const part = (o: Intl.DateTimeFormatOptions) => d.toLocaleDateString("fr-FR", { ...o, timeZone: TZ });
  const titre = `${dom?.nom ?? "?"} – ${ext?.nom ?? "?"}`;
  return (
    <article className="card match" id={`match-${match.id}`}>
      <div className="when">
        <small>{part({ weekday: "short" })}</small>
        <b>{part({ day: "numeric" })}</b>
        <small>{part({ month: "short" })}</small>
      </div>
      <div className="teams">
        <div className={`trow ${score && (match.buts_domicile ?? 0) > (match.buts_exterieur ?? 0) ? "win" : ""}`}>
          <Crest club={dom} />
          <span className="nm">{dom?.nom}</span>
          <span className="sc num">{score ? match.buts_domicile : ""}</span>
        </div>
        <div className={`trow ${score && (match.buts_exterieur ?? 0) > (match.buts_domicile ?? 0) ? "win" : ""}`}>
          <Crest club={ext} />
          <span className="nm">{ext?.nom}</span>
          <span className="sc num">{score ? match.buts_exterieur : ""}</span>
        </div>
      </div>
      <div className="mside">
        <StatutPill statut={match.statut} />
        <span className="small">
          {heure(match.date_heure)} · {match.terrain}
          {match.poule ? ` · Poule ${match.poule}` : ` · ${match.phase}`}
        </span>
        {match.statut === "terminé" && !match.resultat_valide && <span className="small">Résultat provisoire</span>}
        <Link className="small" href={`/matchs/${match.id}`}>{match.statut === "en cours" ? "Suivre en direct" : "Détails du match"}</Link>
        <a className="small" href={lienWhatsApp(`${titre} · BÊGNANAN DALOA CUP`)} target="_blank" rel="noopener">
          Partager
        </a>
      </div>
    </article>
  );
}
