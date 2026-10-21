import type { LigneClassement } from "./types.ts";

/**
 * Trie un classement de poule : points, puis différence de buts, puis buts marqués.
 * Ordre provisoire, à remplacer par les critères validés par le comité.
 * Les égalités parfaites sont signalées pour décision officielle, jamais tranchées au hasard.
 */
export function trierClassement(lignes: LigneClassement[]) {
  const triees = [...lignes].sort(
    (a, b) => b.points - a.points || b.difference - a.difference || b.buts_pour - a.buts_pour || a.nom.localeCompare(b.nom, "fr"),
  );
  const egalites = new Set<string>();
  for (let i = 1; i < triees.length; i++) {
    const a = triees[i - 1], b = triees[i];
    if (a.joues > 0 && a.points === b.points && a.difference === b.difference && a.buts_pour === b.buts_pour) {
      egalites.add(a.club_id);
      egalites.add(b.club_id);
    }
  }
  return { triees, egalites };
}

/** Licences : 10 incluses par club, les suivantes au tarif fixé par le comité. */
export function supplementLicences(nombre: number, tarif: number | null) {
  const payantes = Math.max(0, nombre - 10);
  return { incluses: Math.min(nombre, 10), payantes, montant: tarif === null ? null : payantes * tarif };
}
