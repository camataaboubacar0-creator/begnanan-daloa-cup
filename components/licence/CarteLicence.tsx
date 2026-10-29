import QRCode from "qrcode";
import { sceauCarte } from "@/lib/sceau";
import { FONCTIONS, type Encadrant, type Joueur } from "@/lib/types";

/**
 * Carte au format carte bancaire (85,6 × 54 mm), en deux faces côte à côte : à l'impression,
 * on plie au milieu pour avoir le recto (tournoi) et le verso (identité et QR code) dos à dos.
 * Le QR code ouvre la page publique de vérification. Sert aux licences des joueurs et aux
 * cartes de l'encadrement (président, coach, adjoint).
 * En aperçu (espace des présidents), la carte est marquée « non valable » et n'a pas de QR code :
 * seules les cartes de l'organisation portent un QR code signé, reconnu à la vérification.
 */
export async function Carte({ numero, nom, prenoms, titre, club, detail, base, photo, logo, saison, apercu }: {
  numero: string;
  nom: string;
  prenoms: string;
  titre: string;
  club: string;
  detail?: string;
  base: string;
  photo?: string | null;
  logo?: string | null;
  saison: number;
  apercu?: boolean;
}) {
  const lien = `${base}/licence/${numero}?s=${sceauCarte(numero)}`;
  // Marge blanche de 2 modules et correction d'erreur élevée : lisible même imprimé petit ou plastifié.
  const qr = apercu ? "" : await QRCode.toString(lien, { type: "svg", margin: 2, errorCorrectionLevel: "Q", color: { dark: "#000000", light: "#ffffff" } });
  const filigrane = apercu && <div className="face-filigrane" aria-hidden="true">Aperçu · non valable</div>;
  const initiales = `${prenoms[0] ?? ""}${nom[0] ?? ""}`.toUpperCase();
  return (
    <div className={`carte${apercu ? " apercu" : ""}`}>
      <div className="face recto">
        <img className="recto-logo" src="/logo.webp" alt="" />
        <div className="recto-nom">Bêgnanan Daloa Cup</div>
        <div className="recto-saison">Saison {saison} · Daloa</div>
        <div className="recto-type">{titre}</div>
        <div className="recto-club">
          {logo && <img src={logo} alt="" />}
          <span>{club}</span>
        </div>
        {filigrane}
      </div>
      <div className="face verso">
        <div className="verso-tete">
          <img src="/logo-small.webp" alt="" />
          <span>Bêgnanan Daloa Cup · {saison}</span>
          <b>{titre}</b>
        </div>
        <div className="verso-corps">
          {photo ? <img className="verso-photo" src={photo} alt={`${prenoms} ${nom}`} /> : <div className="verso-photo vide" aria-hidden="true">{initiales}</div>}
          <div className="verso-infos">
            <b className="verso-nom">{prenoms} {nom}</b>
            <span className="verso-club">
              {logo && <img src={logo} alt="" />}
              {club}
            </span>
            {detail && <span className="verso-detail">{detail}</span>}
            <span className="verso-numero">{numero}</span>
          </div>
          {apercu ? (
            <div className="verso-qr sans-qr">QR code remis par l&apos;organisation</div>
          ) : (
            <a className="verso-qr" href={lien} aria-label={`Vérifier la carte ${numero}`} dangerouslySetInnerHTML={{ __html: qr }} />
          )}
        </div>
        <div className="verso-pied">{apercu ? "Aperçu : la carte officielle est imprimée par l'organisation" : "Scannez le QR code pour vérifier cette carte"}</div>
        {filigrane}
      </div>
    </div>
  );
}

type Commun = { club: string; logo?: string | null; base: string; saison: number; apercu?: boolean };

export function CarteLicence({ joueur, ...commun }: Commun & { joueur: Joueur }) {
  const detail = [joueur.poste, joueur.numero_maillot ? `n° ${joueur.numero_maillot}` : ""].filter(Boolean).join(" · ");
  return <Carte numero={joueur.numero_licence!} nom={joueur.nom} prenoms={joueur.prenoms} titre="Licence joueur" detail={detail} photo={joueur.photo_url} {...commun} />;
}

export function CarteEncadrant({ encadrant, ...commun }: Commun & { encadrant: Encadrant }) {
  return <Carte numero={encadrant.numero_carte!} nom={encadrant.nom} prenoms={encadrant.prenoms} titre={FONCTIONS[encadrant.fonction]} photo={encadrant.photo_url} {...commun} />;
}
