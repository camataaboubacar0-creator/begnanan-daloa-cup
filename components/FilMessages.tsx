import type { MessageClub } from "@/lib/types";

const quand = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Abidjan" });

/** Fil de discussion entre un club et le comité, du plus ancien au plus récent. */
export function FilMessages({ messages, cote }: { messages: MessageClub[]; cote: "club" | "comite" }) {
  if (!messages.length) return <p className="small">Aucun message pour l&apos;instant.</p>;
  return (
    <div className="fil">
      {messages.map((m) => (
        <div key={m.id} className={`bulle${m.de_comite === (cote === "comite") ? " moi" : ""}`}>
          <p>{m.texte}</p>
          <span className="small">{m.de_comite ? "Comité" : "Club"}{m.auteur_nom ? ` · ${m.auteur_nom}` : ""} · {quand(m.cree_le)}</span>
        </div>
      ))}
    </div>
  );
}
