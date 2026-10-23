import type { Match, Periode, TirAuBut } from "./types";

// Chrono du match et séance de tirs au but : calculs partagés par l'espace comité et les pages publiques.

export const PERIODES: Record<Periode, string> = {
  mt1: "1re mi-temps",
  mt2: "2e mi-temps",
  prol1: "1re prolongation",
  prol2: "2e prolongation",
  tab: "Tirs au but",
};

/** Ce qui s'affiche quand une période est finie et que la suivante n'a pas commencé. */
const ENTRE_DEUX: Record<Periode, string> = {
  mt1: "Mi-temps",
  mt2: "Fin du temps réglementaire",
  prol1: "Pause des prolongations",
  prol2: "Fin des prolongations",
  tab: "Tirs au but",
};

export type Durees = { mi_temps: number | null; prolongation: number | null };
export type Chrono = Pick<Match, "periode" | "periode_terminee" | "chrono_lance" | "chrono_ecoule">;

export const libellePeriode = (m: Chrono) => (m.periode ? (m.periode_terminee ? ENTRE_DEUX[m.periode] : PERIODES[m.periode]) : "");

/** Secondes jouées dans la période en cours. */
export function secondesJouees(m: Chrono, maintenant = Date.now()) {
  const enCours = m.chrono_lance ? Math.max(0, Math.floor((maintenant - Date.parse(m.chrono_lance)) / 1000)) : 0;
  return (m.chrono_ecoule ?? 0) + enCours;
}

/** Durée prévue de la période, en minutes (null : pas encore fixée, ou tirs au but). */
export function dureePeriode(p: Periode, d: Durees) {
  return p === "mt1" || p === "mt2" ? d.mi_temps : p === "prol1" || p === "prol2" ? d.prolongation : null;
}

/** Minute de jeu où commence la période : la 2e mi-temps reprend après la 1re, etc. */
function debutPeriode(p: Periode, d: Durees) {
  if (p === "mt1") return 0;
  if (d.mi_temps === null) return null;
  if (p === "mt2") return d.mi_temps;
  if (p === "prol1") return 2 * d.mi_temps;
  return d.prolongation === null ? null : 2 * d.mi_temps + d.prolongation;
}

/**
 * Minute de jeu à afficher (« 12' », arrêts de jeu « 20+2' ») et à enregistrer pour un but ou
 * un carton. Si les durées ne sont pas fixées, la minute compte depuis le début de la période.
 */
export function minuteDeJeu(m: Chrono, d: Durees, maintenant = Date.now()) {
  if (!m.periode || m.periode === "tab") return null;
  const minute = Math.floor(secondesJouees(m, maintenant) / 60) + 1;
  const debut = debutPeriode(m.periode, d) ?? 0;
  const duree = dureePeriode(m.periode, d);
  const valeur = Math.min(130, debut + minute);
  const texte = duree !== null && minute > duree ? `${debut + duree}+${minute - duree}'` : `${debut + minute}'`;
  return { valeur, texte };
}

/** Périodes qui peuvent suivre une période terminée. */
export function suites(m: Chrono): Periode[] {
  if (!m.periode_terminee) return [];
  if (m.periode === "mt1") return ["mt2"];
  if (m.periode === "mt2") return ["prol1", "tab"];
  if (m.periode === "prol1") return ["prol2"];
  if (m.periode === "prol2") return ["tab"];
  return [];
}

/**
 * Séance de tirs au but : n tireurs par équipe, puis un contre un (mort subite) tant que c'est
 * égal. La séance s'arrête dès qu'une équipe ne peut plus être rattrapée.
 */
export function bilanTirs(tirs: TirAuBut[], dom: string, ext: string, n: number) {
  const ordre = [...tirs].sort((a, b) => a.ordre - b.ordre);
  const d = ordre.filter((t) => t.club_id === dom);
  const e = ordre.filter((t) => t.club_id === ext);
  const bd = d.filter((t) => t.reussi).length;
  const be = e.filter((t) => t.reussi).length;
  let vainqueur: string | null = null;
  if (Math.max(d.length, e.length) <= n) {
    if (bd + (n - d.length) < be) vainqueur = ext;
    else if (be + (n - e.length) < bd) vainqueur = dom;
  } else if (d.length === e.length && bd !== be) {
    vainqueur = bd > be ? dom : ext;
  }
  // L'équipe qui a tiré la première (au choix de l'arbitre) ouvre chaque tour.
  const premier = ordre[0]?.club_id ?? null;
  const prochain = vainqueur ? null : d.length === e.length ? premier : d.length < e.length ? dom : ext;
  return { dom: d, ext: e, buts: [bd, be] as const, vainqueur, prochain, mortSubite: d.length >= n && e.length >= n && !vainqueur };
}
