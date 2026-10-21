import QRCode from "qrcode";
import type { Joueur } from "@/lib/types";

/** Carte de licence : le QR code ouvre la page publique de vérification. */
export async function CarteLicence({ joueur, club, base }: { joueur: Joueur; club: string; base: string }) {
  const lien = `${base}/licence/${joueur.numero_licence}`;
  const qr = await QRCode.toString(lien, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
  const initiales = `${joueur.prenoms[0] ?? ""}${joueur.nom[0] ?? ""}`.toUpperCase();
  return (
    <div className="licence">
      <div style={{ display: "flex", gap: 14, alignItems: "center", minWidth: 0 }}>
        <div className="photo" aria-hidden="true">{initiales}</div>
        <div style={{ minWidth: 0 }}>
          <div className="lic-t">Licence joueur · {new Date().getFullYear()}</div>
          <b style={{ fontSize: "1.1rem", display: "block" }}>{joueur.prenoms} {joueur.nom}</b>
          <div className="small" style={{ opacity: 0.85 }}>{club}{joueur.poste ? ` · ${joueur.poste}` : ""}{joueur.numero_maillot ? ` · n° ${joueur.numero_maillot}` : ""}</div>
          <div className="no">{joueur.numero_licence}</div>
        </div>
      </div>
      <a className="qr" href={lien} aria-label={`Vérifier la licence ${joueur.numero_licence}`} dangerouslySetInnerHTML={{ __html: qr }} />
    </div>
  );
}
