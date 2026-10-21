import { heure, jourCourt } from "@/lib/format";
import { TYPES_ALERTE, type Alerte } from "@/lib/types";

const URGENT = new Set(["incident", "annulation", "report"]);

/** Annonces du comité : les plus récentes d'abord, les urgences mises en avant. */
export function Annonces({ alertes }: { alertes: Alerte[] }) {
  return (
    <ul className="annonces">
      {alertes.map((a) => (
        <li key={a.id} className={URGENT.has(a.type) ? "urgent" : ""}>
          <span className="annonce-type">{TYPES_ALERTE[a.type]}</span>
          <b>{a.titre}</b>
          {a.texte && <p>{a.texte}</p>}
          <time dateTime={a.publiee_le}>{jourCourt(a.publiee_le)} · {heure(a.publiee_le)}</time>
        </li>
      ))}
    </ul>
  );
}
