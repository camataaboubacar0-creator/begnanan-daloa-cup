import type { Metadata } from "next";
import Link from "next/link";
import { getClubs, getGalerie, getMatchs, getPublications, parId } from "@/lib/data";
import { CartePublication } from "./CartePublication";
import { FiltreMedias } from "./FiltreMedias";

export const revalidate = 30;
export const metadata: Metadata = { title: "Médias" };

export default async function Medias() {
  const [publications, clubsListe, matchs, galerie] = await Promise.all([getPublications(), getClubs(), getMatchs(), getGalerie()]);
  const clubs = parId(clubsListe);
  const indexMatchs = parId(matchs);
  const hdm = publications.filter((p) => p.type === "hdm");

  return (
    <>
      <section className="band">
        <div className="wrap">
          <div className="head">
            <div>
              <div className="eyebrow">Médias</div>
              <h1 className="h2">Débriefs et annonces</h1>
              <p>Les résumés vidéo des matchs, les annonces du comité et les hommes du match.</p>
            </div>
          </div>
          {hdm.length > 0 && (
            <div className="hdm-strip">
              {hdm.slice(0, 8).map((p) => (
                <Link key={p.id} className="hdm-chip" href={`/medias/${p.id}`}>
                  <span className="star">★</span>
                  <span><b>{p.joueur}</b><small>{p.club_id ? clubs.get(p.club_id)?.nom : ""}</small></span>
                </Link>
              ))}
            </div>
          )}
          {publications.length ? (
            <FiltreMedias>
              {publications.map((p) => (
                <div key={p.id} data-type={p.type} style={{ display: "grid" }}>
                  <CartePublication pub={p} clubs={clubs} matchs={indexMatchs} />
                </div>
              ))}
            </FiltreMedias>
          ) : (
            <div className="card vide"><h3>Rien pour le moment</h3><p className="small">Les publications du comité apparaîtront ici.</p></div>
          )}
        </div>
      </section>
      {galerie.length > 0 && (
        <section className="band alt">
          <div className="wrap">
            <div className="head"><div><div className="eyebrow">Galerie</div><h2>En images</h2></div></div>
            <div className="gal">
              {galerie.map((g, i) => (
                <figure key={g.id} className={`gal-i ${i === 0 ? "big" : ""}`} style={{ margin: 0 }}>
                  {g.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.image_url} alt={g.legende} loading="lazy" />
                  ) : (
                    <span className="gal-ph">Photo à venir</span>
                  )}
                  <figcaption className="gal-cap">{g.legende}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
