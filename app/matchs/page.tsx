import type { Metadata } from "next";
import { getClubs, getMatchs } from "@/lib/data";
import { ListeMatchs } from "./ListeMatchs";

export const revalidate = 30;
export const metadata: Metadata = { title: "Calendrier et résultats" };

export default async function Matchs() {
  const [matchs, clubs] = await Promise.all([getMatchs(), getClubs()]);
  return (
    <section className="band">
      <div className="wrap">
        <div className="head">
          <div>
            <div className="eyebrow">Calendrier et résultats</div>
            <h1 className="h2">Les rencontres</h1>
            <p>Filtrez par poule, équipe ou statut. Un score reste provisoire tant que le comité ne l&apos;a pas validé.</p>
          </div>
        </div>
        {matchs.length ? (
          <ListeMatchs matchs={matchs} clubs={clubs} />
        ) : (
          <div className="card vide"><h3>Calendrier à venir</h3><p className="small">Les matchs seront publiés après le tirage au sort.</p></div>
        )}
      </div>
    </section>
  );
}
