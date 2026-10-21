import type { Club, Match, Publication } from "@/lib/types";
import Link from "next/link";
import { Crest } from "@/components/Crest";

export const TYPES_PUBLICATION: Record<Publication["type"], string> = {
  debrief: "Débrief",
  annonce: "Annonce",
  hdm: "Homme du match",
};

const datePub = (p: Publication) =>
  new Date(p.publiee_le ?? p.cree_le).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Africa/Abidjan" });

const scoreCourt = (m: Match, clubs: Map<string, Club>) => {
  const joue = m.statut === "terminé" || m.statut === "en cours";
  return `${clubs.get(m.club_domicile)?.sigle ?? "?"} ${joue ? `${m.buts_domicile}-${m.buts_exterieur}` : "vs"} ${clubs.get(m.club_exterieur)?.sigle ?? "?"}`;
};

const Lecture = () => (
  <span className="play" aria-hidden="true">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
  </span>
);

export function CartePublication({ pub, clubs, matchs }: { pub: Publication; clubs: Map<string, Club>; matchs: Map<string, Match> }) {
  const match = pub.match_id ? matchs.get(pub.match_id) : undefined;
  const lien = `/medias/${pub.id}`;

  if (pub.type === "hdm") {
    return (
      <Link className="card hdm reveal" href={lien}>
        <div className="hdm-badge">★</div>
        <span className="eyebrow">Homme du match · {datePub(pub)}</span>
        <h3>{pub.joueur}</h3>
        <p className="small">
          {pub.club_id ? clubs.get(pub.club_id)?.nom : ""}
          {match ? ` · ${scoreCourt(match, clubs)}` : ""}
        </p>
        <p>{pub.texte}</p>
      </Link>
    );
  }

  const dom = match ? clubs.get(match.club_domicile) : undefined;
  const ext = match ? clubs.get(match.club_exterieur) : undefined;
  return (
    <Link className="card news reveal" href={lien}>
      {match ? (
        <div className="thumb" style={{ "--c1": dom?.couleur, "--c2": ext?.couleur } as React.CSSProperties}>
          <Crest club={dom} />
          <span className="thumb-s mono">
            {match.statut === "terminé" || match.statut === "en cours" ? `${match.buts_domicile} - ${match.buts_exterieur}` : "VS"}
          </span>
          <Crest club={ext} />
          {pub.video_url && <Lecture />}
        </div>
      ) : (
        <div className="thumb" style={{ "--c1": "var(--pitch)", "--c2": "#0b4a1b" } as React.CSSProperties}>
          <span className="thumb-t">BDC</span>
          {pub.video_url && <Lecture />}
        </div>
      )}
      <div className="body">
        <span className="eyebrow">{TYPES_PUBLICATION[pub.type]} · {datePub(pub)}</span>
        <h3>{pub.titre}</h3>
        <p className="small">{pub.texte.length > 160 ? `${pub.texte.slice(0, 160)}…` : pub.texte}</p>
      </div>
    </Link>
  );
}
