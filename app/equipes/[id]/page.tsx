import { notFound } from "next/navigation";
import { Crest } from "@/components/Crest";
import { MatchCard } from "@/components/MatchCard";
import { getClubs, getMatchs, parId } from "@/lib/data";

export const revalidate = 30;

export default async function FicheClub({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [clubs, matchs] = await Promise.all([getClubs(), getMatchs()]);
  const club = clubs.find((c) => c.id === id);
  if (!club) notFound();
  const index = parId(clubs);
  const siens = matchs.filter((m) => m.club_domicile === id || m.club_exterieur === id);

  return (
    <section className="band">
      <div className="wrap">
        <div className="head" style={{ alignItems: "center" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <Crest club={club} size="crest" />
            <div>
              <div className="eyebrow">{club.poule ? `Poule ${club.poule}` : "Poule à tirer"}{club.quartier ? ` · ${club.quartier}` : ""}</div>
              <h1 className="h2">{club.nom}</h1>
            </div>
          </div>
        </div>
        {club.presentation && <p style={{ maxWidth: "65ch", marginBottom: 24 }}>{club.presentation}</p>}
        <h3 style={{ marginBottom: 12 }}>Matchs</h3>
        {siens.length ? (
          <div className="grid g2">{siens.map((m) => <MatchCard key={m.id} match={m} clubs={index} />)}</div>
        ) : (
          <p className="small">Aucun match programmé pour le moment.</p>
        )}
      </div>
    </section>
  );
}
