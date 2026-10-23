"use client";

import { useActionState } from "react";
import type { Etat } from "@/lib/admin";
import { ajouterEvenement } from "./actions";

const BOUTONS = [
  ["but", "⚽ But", "primary"],
  ["jaune", "⏱️ 2 min", "line"],
  ["rouge", "⛔ 5 min", "line"],
  ["csc", "Contre son camp", "line"],
] as const;

/** Saisie d'un but ou d'un carton pour une équipe : un bouton par type, pensé pour le téléphone. */
export function SaisieEquipe({ matchId, club, joueurs }: { matchId: string; club: { id: string; nom: string }; joueurs: { id: string; nom: string }[] }) {
  const [etat, envoyer, envoi] = useActionState<Etat, FormData>(ajouterEvenement, {});
  return (
    <form action={envoyer} className="card direct-equipe">
      <h3 style={{ marginBottom: 10 }}>{club.nom}</h3>
      <input type="hidden" name="match_id" value={matchId} />
      <input type="hidden" name="club_id" value={club.id} />
      <div className="form-row" style={{ marginTop: 0 }}>
        <label className="field" style={{ flex: "3 1 160px" }}>Joueur
          <select name="joueur_id" defaultValue="">
            <option value="">Non précisé</option>
            {joueurs.map((j) => <option key={j.id} value={j.id}>{j.nom}</option>)}
          </select>
        </label>
        <label className="field" style={{ flex: "1 1 70px" }}>Minute<input name="minute" type="number" min={0} max={130} inputMode="numeric" /></label>
      </div>
      <div className="direct-boutons">
        {BOUTONS.map(([t, libelle, style]) => (
          <button key={t} name="type" value={t} className={`btn ${style}`} disabled={envoi}>{libelle}</button>
        ))}
      </div>
      {etat.erreur && <p className="form-err">{etat.erreur}</p>}
      {etat.ok && <p className="form-ok">{etat.ok}</p>}
    </form>
  );
}
