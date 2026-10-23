"use client";

import { useState } from "react";

// Format carte bancaire et mise en page A4 identique à l'impression du navigateur.
const L = 85.6;
const H = 54;
const MARGE_HAUT = 12;
const ECART = 8;
const PAR_PAGE = 4;

/**
 * Fabrique un PDF A4 des cartes affichées (4 par page, recto et verso côte à côte, à plier au
 * milieu), à partir des faces telles qu'elles s'affichent : la photo de chaque face est prise à
 * environ 300 points par pouce, ce qui garde le QR code net.
 */
async function pdfDesCartes(fichier: string) {
  const [{ toJpeg }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const gauche = (210 - 2 * L) / 2;
  const cartes = [...document.querySelectorAll<HTMLElement>(".cartes-print .carte")];
  for (const [i, carte] of cartes.entries()) {
    if (i && i % PAR_PAGE === 0) pdf.addPage();
    const y = MARGE_HAUT + (i % PAR_PAGE) * (H + ECART);
    const faces = [...carte.querySelectorAll<HTMLElement>(".face")];
    for (const [j, face] of faces.entries()) {
      // JPEG : un PDF léger (quelques centaines de Ko par page) que le téléphone ouvre vite.
      const image = await toJpeg(face, { pixelRatio: 1011 / face.offsetWidth, quality: 0.9, backgroundColor: "#ffffff", cacheBust: true, style: { borderRadius: "0", boxShadow: "none" } });
      pdf.addImage(image, "JPEG", gauche + j * L, y, L, H);
    }
    // Pointillés : découpe autour de la carte, pliage au milieu.
    pdf.setDrawColor(150, 160, 155);
    pdf.setLineWidth(0.2);
    pdf.setLineDashPattern([1.2, 1.2], 0);
    pdf.rect(gauche, y, 2 * L, H);
    pdf.line(gauche + L, y, gauche + L, y + H);
  }
  pdf.save(fichier);
}

/**
 * Lance l'impression. Samsung Internet ignore l'impression demandée par un site : on y fabrique
 * directement le PDF des cartes, que le téléphone ouvre et imprime.
 */
export function BoutonImprimer({ libelle = "Imprimer", fichier = "cartes.pdf" }: { libelle?: string; fichier?: string }) {
  const [etat, setEtat] = useState<"" | "pdf" | "erreur">("");
  return (
    <>
      <button
        type="button"
        className="btn primary sm"
        disabled={etat === "pdf"}
        onClick={async () => {
          if (!/SamsungBrowser/i.test(navigator.userAgent)) return window.print();
          setEtat("pdf");
          try {
            await pdfDesCartes(fichier);
            setEtat("");
          } catch (e) {
            console.error(e);
            setEtat("erreur");
          }
        }}
      >
        {etat === "pdf" ? "Préparation du PDF…" : libelle}
      </button>
      {etat === "erreur" && <p className="small aide-impression">Le PDF n&apos;a pas pu être préparé. Réessayez, ou ouvrez cette page dans Chrome.</p>}
    </>
  );
}
