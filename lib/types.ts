export type RoleOrganisateur = "admin" | "comite" | "billetterie" | "medias";
/** Les présidents de club ont leur propre table : ce ne sont pas des organisateurs. */
export type Role = RoleOrganisateur | "president";
export type StatutMatch = "programmé" | "en cours" | "terminé" | "reporté" | "interrompu" | "annulé";

export interface Tournoi {
  nom: string;
  lieu: string;
  date_debut: string;
  date_fin: string;
  dates_confirmees: boolean;
  accroche: string;
  capacite_clubs: number;
  licences_incluses?: number;
  tarif_licence_fcfa?: number | null;
  mercato_ouvert?: boolean;
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
  disqualifie?: boolean;
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

export type TypeEvenement = "but" | "csc" | "jaune" | "rouge";

/** But ou carton saisi pendant un match ; club_id = équipe à qui il est compté. */
export interface EvenementMatch {
  id: string;
  match_id: string;
  club_id: string;
  type: TypeEvenement;
  joueur_id: string | null;
  joueur_nom: string | null;
  minute: number | null;
  cree_le: string;
}

export interface Buteur {
  joueur_nom: string;
  club_id: string;
  buts: number;
  jaunes: number;
  rouges: number;
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
  admin: { label: "Administrateur", pages: ["tournoi", "matchs", "direct", "tirage", "annonces", "licences", "mercato", "cartes", "messages", "billets", "medias", "comptes"] },
  comite: { label: "Comité", pages: ["tournoi", "matchs", "direct", "tirage", "annonces", "licences", "mercato", "cartes", "messages"] },
  billetterie: { label: "Billetterie", pages: ["billets"] },
  medias: { label: "Médias", pages: ["medias"] },
  president: { label: "Président de club", pages: ["club", "mercato", "cartes", "messages"] },
};

export const ROLES_ORGANISATEURS = ["admin", "comite", "billetterie", "medias"] as const satisfies readonly RoleOrganisateur[];

export type EtatLicence = "brouillon" | "soumise" | "active" | "refusée";

export interface Joueur {
  id: string;
  club_id: string;
  nom: string;
  prenoms: string;
  date_naissance: string | null;
  poste: string | null;
  numero_maillot: number | null;
  etat: EtatLicence;
  payante: boolean;
  validation_sportive: boolean;
  paiement_recu: boolean;
  doublon_possible: boolean;
  motif_refus: string | null;
  numero_licence: string | null;
  soumise_le: string | null;
  transfere?: boolean;
  photo_url?: string | null;
}

export interface DemandeClub {
  id: string;
  nom_club: string;
  quartier: string | null;
  president_nom: string;
  telephone: string;
  email: string;
  message: string | null;
  statut: "en attente" | "acceptée" | "refusée";
  club_id: string | null;
  cree_le: string;
  user_id?: string | null;
  identifiant?: string | null;
  president_prenoms?: string | null;
  logo_url?: string | null;
  president_photo_url?: string | null;
  encadrement?: { fonction: "coach" | "adjoint"; nom: string; prenoms: string; telephone: string | null; photo_url: string | null }[];
  joueurs?: { nom: string; prenoms: string; date_naissance?: string | null; poste: string | null; numero_maillot: number | null; photo_url: string | null }[];
}

export interface MessageClub {
  id: string;
  club_id: string;
  de_comite: boolean;
  auteur_nom: string | null;
  texte: string;
  lu: boolean;
  cree_le: string;
}

export interface ModificationClub {
  id: string;
  club_id: string;
  objet: "profil" | "joueur" | "encadrant";
  action: "modifier" | "retirer";
  cible: string | null;
  donnees: Record<string, string | number | null>;
  libelle: string | null;
  statut: "en attente" | "acceptée" | "refusée" | "annulée";
  motif: string | null;
  cree_le: string;
  traitee_le: string | null;
}

export type Fonction = "président" | "coach" | "adjoint";
export const FONCTIONS: Record<Fonction, string> = { président: "Président du club", coach: "Coach", adjoint: "Coach adjoint" };

export interface Encadrant {
  id: string;
  club_id: string;
  fonction: Fonction;
  nom: string;
  prenoms: string;
  telephone: string | null;
  valide: boolean;
  numero_carte: string | null;
  photo_url?: string | null;
}

export type StatutTransfert = "demandé" | "accepté par le club" | "validé" | "refusé";

export interface Transfert {
  id: string;
  joueur_id: string;
  joueur: string;
  numero_licence: string;
  club_depart: string;
  club_arrivee: string;
  montant_fcfa: number | null;
  statut: StatutTransfert;
  cree_le: string;
}

export type TypeAlerte = "info" | "incident" | "annulation" | "report" | "calendrier";
export const TYPES_ALERTE: Record<TypeAlerte, string> = {
  info: "Information",
  incident: "Incident",
  annulation: "Match annulé",
  report: "Match reporté",
  calendrier: "Calendrier",
};

export interface Alerte {
  id: string;
  type: TypeAlerte;
  titre: string;
  texte: string;
  match_id: string | null;
  publiee_le: string;
  envoyee_le: string | null;
}
