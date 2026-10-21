import QRCode from "qrcode";
import { FONCTIONS, type Encadrant, type Joueur } from "@/lib/types";

const SAISON = new Date().getFullYear();

/**
 * Carte au format carte bancaire (imprimable) : le QR code ouvre la page publique de vérification.
 * Sert aux licences des joueurs et aux cartes de l'encadrement (président, coach, adjoint).
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
  const qr = await QRCode.toString(lien, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
  const initiales = `${prenoms[0] ?? ""}${nom[0] ?? ""}`.toUpperCase();
  return (
    <div className="licence">
      <div style={{ display: "flex", gap: 14, alignItems: "center", minWidth: 0 }}>
        {photo ? <img className="photo" src={photo} alt={`${prenoms} ${nom}`} /> : <div className="photo" aria-hidden="true">{initiales}</div>}
        <div style={{ minWidth: 0 }}>
          <div className="lic-t">BÊGNANAN DALOA CUP · {SAISON}</div>
          <div className="lic-f">{titre}</div>
          <b className="lic-n">{prenoms} {nom}</b>
          <div className="small lic-club" style={{ opacity: 0.85 }}>
            {logo && <img src={logo} alt="" />}
            {club}{detail ? ` · ${detail}` : ""}
          </div>
          <div className="no">{numero}</div>
        </div>
      </div>
      <a className="qr" href={lien} aria-label={`Vérifier la carte ${numero}`} dangerouslySetInnerHTML={{ __html: qr }} />
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
