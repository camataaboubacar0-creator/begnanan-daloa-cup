import { bilanTirs } from "@/lib/chrono";
import type { TirAuBut } from "@/lib/types";

/** Feuille de la séance : un rond par tir, vert s'il est marqué, barré s'il est manqué. */
export function TirsAuBut({ tirs, equipes, tireurs }: { tirs: TirAuBut[]; equipes: { id: string; nom: string }[]; tireurs: number }) {
  const [dom, ext] = equipes;
  const b = bilanTirs(tirs, dom.id, ext.id, tireurs);
  const cases = Math.max(tireurs, b.dom.length, b.ext.length);
  const statut = b.vainqueur
    ? `${b.vainqueur === dom.id ? dom.nom : ext.nom} remporte la séance`
    : b.mortSubite
      ? "Mort subite : un tireur par équipe jusqu'à la différence"
      : `${tireurs} tireurs par équipe, puis mort subite en cas d'égalité`;
  return (
    <div className="tab-feuille">
      {[{ e: dom, l: b.dom, n: b.buts[0] }, { e: ext, l: b.ext, n: b.buts[1] }].map(({ e, l, n }) => (
        <div key={e.id} className={`tab-ligne${b.vainqueur === e.id ? " gagne" : ""}`}>
          <span>{e.nom}</span>
          <span className="tab-tirs">
            {Array.from({ length: cases }, (_, i) => {
              const t = l[i];
              return <i key={i} className={t ? (t.reussi ? "ok" : "rate") : ""} title={t ? `${t.joueur_nom ?? "Tireur"} : ${t.reussi ? "marqué" : "manqué"}` : undefined} />;
            })}
          </span>
          <b className="num">{n}</b>
        </div>
      ))}
      <p className="small">{statut}</p>
    </div>
  );
}
