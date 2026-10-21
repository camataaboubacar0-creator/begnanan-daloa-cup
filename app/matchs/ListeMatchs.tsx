"use client";

import { useMemo, useState } from "react";
import { MatchCard } from "@/components/MatchCard";
import type { Club, Match, StatutMatch } from "@/lib/types";

const STATUTS: StatutMatch[] = ["programmé", "en cours", "terminé", "reporté", "interrompu", "annulé"];
const PAS = 12;

export function ListeMatchs({ matchs, clubs }: { matchs: Match[]; clubs: Club[] }) {
  const [poule, setPoule] = useState("");
  const [club, setClub] = useState("");
  const [statut, setStatut] = useState("");
  const [phase, setPhase] = useState("");
  const [limite, setLimite] = useState(PAS);

  const index = useMemo(() => new Map(clubs.map((c) => [c.id, c])), [clubs]);
  const poules = useMemo(() => [...new Set(matchs.map((m) => m.poule).filter(Boolean))].sort() as string[], [matchs]);
  const phases = useMemo(() => [...new Set(matchs.map((m) => m.phase))], [matchs]);

  const filtres = matchs.filter(
    (m) =>
      (!poule || m.poule === poule) &&
      (!club || m.club_domicile === club || m.club_exterieur === club) &&
      (!statut || m.statut === statut) &&
      (!phase || m.phase === phase),
  );
  const changer = (f: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    f(e.target.value);
    setLimite(PAS);
  };

  return (
    <>
      <div className="filters">
        <select value={poule} onChange={changer(setPoule)} aria-label="Poule">
          <option value="">Toutes les poules</option>
          {poules.map((p) => <option key={p} value={p}>Poule {p}</option>)}
        </select>
        <select value={club} onChange={changer(setClub)} aria-label="Équipe">
          <option value="">Toutes les équipes</option>
          {clubs.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        <select value={statut} onChange={changer(setStatut)} aria-label="Statut">
          <option value="">Tous les statuts</option>
          {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {phases.length > 1 && (
          <select value={phase} onChange={changer(setPhase)} aria-label="Phase">
            <option value="">Toutes les phases</option>
            {phases.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
      </div>
      {filtres.length ? (
        <div className="grid g2">
          {filtres.slice(0, limite).map((m) => <MatchCard key={m.id} match={m} clubs={index} />)}
        </div>
      ) : (
        <div className="card vide"><h3>Aucun match</h3><p className="small">Aucune rencontre ne correspond à ces filtres.</p></div>
      )}
      {filtres.length > limite && (
        <div style={{ textAlign: "center", marginTop: 18 }}>
          <button className="btn line" onClick={() => setLimite(limite + PAS)}>Afficher plus de matchs</button>
        </div>
      )}
    </>
  );
}
