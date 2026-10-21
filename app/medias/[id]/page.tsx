import Link from "next/link";
import { notFound } from "next/navigation";
import { MatchCard } from "@/components/MatchCard";
import { getClubs, getMatchs, getPublications, parId } from "@/lib/data";
import { lienWhatsApp } from "@/lib/format";
import { lienIntegrable } from "@/lib/video";
import { TYPES_PUBLICATION } from "../CartePublication";

export const revalidate = 30;

export default async function Publication({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [publications, clubsListe, matchs] = await Promise.all([getPublications(), getClubs(), getMatchs()]);
  const pub = publications.find((p) => p.id === id);
  if (!pub) notFound();
  const clubs = parId(clubsListe);
  const match = pub.match_id ? matchs.find((m) => m.id === pub.match_id) : undefined;
  const integrable = pub.video_url ? lienIntegrable(pub.video_url) : null;
  const titre = pub.type === "hdm" ? `Homme du match : ${pub.joueur}` : pub.titre;

  return (
    <section className="band">
      <div className="wrap" style={{ maxWidth: 820 }}>
        <Link href="/medias" className="small">← Tous les médias</Link>
        <div className="eyebrow" style={{ marginTop: 16 }}>
          {TYPES_PUBLICATION[pub.type]}
          {pub.publiee_le && ` · ${new Date(pub.publiee_le).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Africa/Abidjan" })}`}
        </div>
        <h1 className="h2" style={{ margin: "6px 0 16px" }}>{titre}</h1>
        {pub.type === "hdm" && pub.club_id && <p className="small" style={{ marginBottom: 12 }}>{clubs.get(pub.club_id)?.nom}</p>}
        {integrable ? (
          <iframe className="vid" src={integrable} title={titre} allow="encrypted-media; picture-in-picture" allowFullScreen style={{ width: "100%", aspectRatio: "16/9", border: 0 }} />
        ) : (
          pub.video_url && <a className="btn primary" href={pub.video_url} target="_blank" rel="noopener">Voir la vidéo</a>
        )}
        <p style={{ whiteSpace: "pre-line", margin: "18px 0" }}>{pub.texte}</p>
        {match && <MatchCard match={match} clubs={clubs} />}
        <a className="btn line sm" style={{ marginTop: 18 }} href={lienWhatsApp(`${titre} · BÊGNANAN DALOA CUP`)} target="_blank" rel="noopener">
          Partager sur WhatsApp
        </a>
      </div>
    </section>
  );
}
