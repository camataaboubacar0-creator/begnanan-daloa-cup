import type { StatutMatch } from "@/lib/types";

const STYLE: Record<StatutMatch, string> = {
  programmé: "info",
  "en cours": "bad",
  terminé: "neutral",
  reporté: "warn",
  interrompu: "warn",
  annulé: "neutral",
};

export function StatutPill({ statut }: { statut: StatutMatch }) {
  return (
    <span className={`pill ${STYLE[statut]}`}>
      {statut === "en cours" && <i className="live-dot" />}
      {statut.charAt(0).toUpperCase() + statut.slice(1)}
    </span>
  );
}
