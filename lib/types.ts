export type Role = "admin" | "comite" | "billetterie" | "medias";
export type StatutMatch = "programmé" | "en cours" | "terminé" | "reporté" | "interrompu" | "annulé";

export interface Tournoi {
  nom: string;
  lieu: string;
  date_debut: string;
  date_fin: string;
  dates_confirmees: boolean;
  accroche: string;
  capacite_clubs: number;
}

export interface Club {
  id: string;
  nom: string;
  sigle: string;
  couleur: string;
  poule: string | null;
  quartier: string | null;
  logo_url: string | null;
  presentation: string | null;
}

export interface Match {
  id: string;
  phase: string;
  poule: string | null;
  club_domicile: string;
  club_exterieur: string;
  date_heure: string;
  terrain: string;
  statut: StatutMatch;
  buts_domicile: number | null;
  buts_exterieur: number | null;
  resultat_valide: boolean;
}

export interface CategorieBillet {
  id: string;
  nom: string;
  description: string;
  prix_fcfa: number;
  places_par_match: number;
  en_vente: boolean;
  ordre: number;
}

export interface Publication {
  id: string;
  type: "debrief" | "annonce" | "hdm";
  titre: string;
  texte: string;
  match_id: string | null;
  joueur: string | null;
  club_id: string | null;
  video_url: string | null;
  publiee: boolean;
  publiee_le: string | null;
  cree_le: string;
}

export interface Photo {
  id: string;
  image_url: string | null;
  legende: string;
  ordre: number;
}

export interface LigneClassement {
  club_id: string;
  nom: string;
  sigle: string;
  couleur: string;
  joues: number;
  gagnes: number;
  nuls: number;
  perdus: number;
  buts_pour: number;
  buts_contre: number;
  difference: number;
  points: number;
}

export const ROLES: Record<Role, { label: string; pages: string[] }> = {
  admin: { label: "Administrateur", pages: ["tournoi", "matchs", "billets", "medias", "comptes"] },
  comite: { label: "Comité", pages: ["tournoi", "matchs"] },
  billetterie: { label: "Billetterie", pages: ["billets"] },
  medias: { label: "Médias", pages: ["medias"] },
};
