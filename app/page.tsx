import Image from "next/image";
import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { Crest } from "@/components/Crest";
import { MatchCard } from "@/components/MatchCard";
import { Hero3D } from "@/components/logo3d/Hero3D";
import { getClubs, getMatchs, getPublications, getTournoi, parId } from "@/lib/data";
import { dateCourte, heure, jourCourt } from "@/lib/format";
import { CartePublication } from "./medias/CartePublication";

export const revalidate = 30;

export default async function Accueil() {
  const [tournoi, clubsListe, matchs, publications] = await Promise.all([getTournoi(), getClubs(), getMatchs(), getPublications()]);
  const clubs = parId(clubsListe);
  const prochain = matchs.find((m) => m.statut === "programmé");
  const enDirect = matchs.filter((m) => m.statut === "en cours");
  const recents = matchs.filter((m) => m.statut === "terminé").slice(-3).reverse();

  return (
    <>
      <Hero3D>
        <div className="wrap">
          <div>
            <div className="eyebrow" style={{ color: "var(--gold)" }}>Tournoi de maracana · Daloa</div>
            <h1 className="sr">{tournoi.nom}</h1>
            <div className="hero-logo" data-logo-3d>
              <Image src="/logo.webp" alt="Logo officiel BÊGNANAN DALOA CUP" width={600} height={587} priority />
            </div>
            <p className="lead">{tournoi.accroche}</p>
            <div className="meta">
              <span className="chip">📍 {tournoi.lieu}</span>
              <span className="chip">
                {dateCourte(tournoi.date_debut)} → {dateCourte(tournoi.date_fin)}
                {!tournoi.dates_confirmees && <span className="tbc">à confirmer</span>}
              </span>
              <span className="chip">{tournoi.capacite_clubs} équipes</span>
            </div>
            <div className="cta">
              <Link className="btn gold" href="/billetterie">Acheter un billet</Link>
              <Link className="btn ghost" href="/matchs">Voir le calendrier</Link>
            </div>
          </div>
          <div className="board">
            <div className="lbl">Coup d&apos;envoi dans</div>
            <Countdown cible={`${tournoi.date_debut}T16:00:00Z`} />
            <hr />
            {prochain ? (
              <>
                <div className="lbl" style={{ textAlign: "center", marginBottom: 12 }}>
                  Prochain match{prochain.poule ? ` · Poule ${prochain.poule}` : ""}
                </div>
                <div className="fixture">
                  <div>
                    <Crest club={clubs.get(prochain.club_domicile)} size="crest" />
                    <div className="tn">{clubs.get(prochain.club_domicile)?.nom}</div>
                  </div>
                  <div className="vs">VS</div>
                  <div>
                    <Crest club={clubs.get(prochain.club_exterieur)} size="crest" />
                    <div className="tn">{clubs.get(prochain.club_exterieur)?.nom}</div>
                  </div>
                </div>
                <div className="where">
                  {jourCourt(prochain.date_heure)} · {heure(prochain.date_heure)} · {prochain.terrain}
                </div>
              </>
            ) : (
              <p className="where">Le calendrier sera publié après le tirage au sort.</p>
            )}
          </div>
        </div>
      </Hero3D>

      {(enDirect.length > 0 || recents.length > 0) && (
        <section className="live">
          <div className="wrap">
            <div className="live-head">
              <div>
                <span className="live-tag">
                  <i className="live-dot" />
                  {enDirect.length ? "En direct" : "Derniers résultats"}
                </span>
                <h3>{enDirect.length ? `${enDirect.length} match${enDirect.length > 1 ? "s" : ""} en cours` : "Pas de match en cours"}</h3>
              </div>
            </div>
            <div className="grid g2">
              {[...enDirect, ...recents].map((m) => (
                <MatchCard key={m.id} match={m} clubs={clubs} />
              ))}
            </div>
          </div>
        </section>
      )}

      {publications.length > 0 && (
        <section className="band alt">
          <div className="wrap">
            <div className="head">
              <div>
                <div className="eyebrow">Médias</div>
                <h2>Dernières publications</h2>
              </div>
              <Link className="btn line sm" href="/medias">Tout voir</Link>
            </div>
            <div className="grid g3">
              {publications.slice(0, 3).map((p) => (
                <CartePublication key={p.id} pub={p} clubs={clubs} matchs={parId(matchs)} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
