import QRCode from "qrcode";
import { FONCTIONS, type Encadrant, type Joueur } from "@/lib/types";

const SAISON = new Date().getFullYear();

/**
 * Carte au format carte bancaire (85,6 × 54 mm), en deux faces côte à côte : à l'impression,
 * on plie au milieu pour avoir le recto (tournoi) et le verso (identité et QR code) dos à dos.
 * Le QR code ouvre la page publique de vérification. Sert aux licences des joueurs et aux
 * cartes de l'encadrement (président, coach, adjoint).
 */
export async function Carte({ numero, nom, prenoms, titre, club, detail, base, photo, logo }: {
  numero: string;
  nom: string;
  prenoms: string;
  titre: string;
  club: string;
  detail?: string;
  base: string;
  photo?: string | null;
  logo?: string | null;
}) {
  const lien = `${base}/licence/${numero}`;
  // Marge blanche de 2 modules et correction d'erreur élevée : lisible même imprimé petit ou plastifié.
  const qr = await QRCode.toString(lien, { type: "svg", margin: 2, errorCorrectionLevel: "Q", color: { dark: "#000000", light: "#ffffff" } });
  const initiales = `${prenoms[0] ?? ""}${nom[0] ?? ""}`.toUpperCase();
  return (
    <div className="carte">
      <div className="face recto">
        <img className="recto-logo" src="/logo.webp" alt="" />
        <div className="recto-nom">Bêgnanan Daloa Cup</div>
        <div className="recto-saison">Saison {SAISON} · Daloa</div>
        <div className="recto-type">{titre}</div>
        <div className="recto-club">
          {logo && <img src={logo} alt="" />}
          <span>{club}</span>
        </div>
      </div>
      <div className="face verso">
        <div className="verso-tete">
          <img src="/logo-small.webp" alt="" />
          <span>Bêgnanan Daloa Cup · {SAISON}</span>
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
          <a className="verso-qr" href={lien} aria-label={`Vérifier la carte ${numero}`} dangerouslySetInnerHTML={{ __html: qr }} />
        </div>
        <div className="verso-pied">Scannez le QR code pour vérifier cette carte</div>
      </div>
    </div>
  );
}

export function CarteLicence({ joueur, club, logo, base }: { joueur: Joueur; club: string; logo?: string | null; base: string }) {
  const detail = [joueur.poste, joueur.numero_maillot ? `n° ${joueur.numero_maillot}` : ""].filter(Boolean).join(" · ");
  return <Carte numero={joueur.numero_licence!} nom={joueur.nom} prenoms={joueur.prenoms} titre="Licence joueur" club={club} detail={detail} base={base} photo={joueur.photo_url} logo={logo} />;
}

export function CarteEncadrant({ encadrant, club, logo, base }: { encadrant: Encadrant; club: string; logo?: string | null; base: string }) {
  return <Carte numero={encadrant.numero_carte!} nom={encadrant.nom} prenoms={encadrant.prenoms} titre={FONCTIONS[encadrant.fonction]} club={club} base={base} photo={encadrant.photo_url} logo={logo} />;
}
