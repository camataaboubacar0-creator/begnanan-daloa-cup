import Link from "next/link";
import { Crest } from "@/components/Crest";
import type { ActualiteClub, Club } from "@/lib/types";

export const dateActu = (iso: string, mois: "short" | "long" = "short") =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: mois, timeZone: "Africa/Abidjan" });

export const lienActu = (a: Pick<ActualiteClub, "id" | "club_id">) => `/equipes/${a.club_id}/actualites/${a.id}`;

/** Aperçu d'une actualité de club : renvoie vers la page du club où on peut commenter et aimer. */
export function CarteActualite({ actu, club }: { actu: ActualiteClub; club?: Club }) {
  return (
    <Link className="card news actu-club reveal" href={lienActu(actu)}>
      {actu.image_url ? (
        <div className="thumb thumb-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={actu.image_url} alt="" loading="lazy" />
        </div>
      ) : (
        <div className="thumb" style={{ "--c1": club?.couleur ?? "var(--pitch)", "--c2": "#0b4a1b" } as React.CSSProperties}>
          <Crest club={club} size="crest" />
        </div>
      )}
      <div className="body">
        <span className="actu-club-tete">
          <Crest club={club} />
          <span className="eyebrow">{club?.nom ?? "Club"} · {dateActu(actu.cree_le)}</span>
        </span>
        <p className="small">{actu.texte.length > 160 ? `${actu.texte.slice(0, 160)}…` : actu.texte}</p>
        <span className="small actu-compteurs">♥ {actu.nb_jaime} · 💬 {actu.nb_commentaires}</span>
      </div>
    </Link>
  );
}
