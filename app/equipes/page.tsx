import type { Metadata } from "next";
import Link from "next/link";
import { Crest } from "@/components/Crest";
import { getClubs, getTournoi } from "@/lib/data";

export const revalidate = 30;
export const metadata: Metadata = { title: "Équipes" };

export default async function Equipes() {
  const [clubs, tournoi] = await Promise.all([getClubs(), getTournoi()]);
  return (
    <section className="band">
      <div className="wrap">
        <div className="head">
          <div>
            <div className="eyebrow">Équipes</div>
            <h1 className="h2">Les clubs engagés</h1>
            <p>{clubs.length} club{clubs.length > 1 ? "s" : ""} inscrit{clubs.length > 1 ? "s" : ""} sur {tournoi.capacite_clubs} places.</p>
          </div>
          <Link className="btn gold sm" href="/inscription-club">Inscrire mon club</Link>
        </div>
        {clubs.length ? (
          <div className="grid g4">
            {clubs.map((c) => (
              <Link key={c.id} href={`/equipes/${c.id}`} className="card team reveal">
                <Crest club={c} size="crest" />
                <b>{c.nom}</b>
                <span className="small">{c.poule ? `Poule ${c.poule}` : "Poule à tirer"}{c.quartier ? ` · ${c.quartier}` : ""}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card vide"><h3>Inscriptions en cours</h3><p className="small">Les clubs apparaîtront ici dès leur validation par le comité.</p></div>
        )}
      </div>
    </section>
  );
}
