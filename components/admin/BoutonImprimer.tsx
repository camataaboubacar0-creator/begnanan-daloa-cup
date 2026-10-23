"use client";

import { useState } from "react";

/**
 * Lance l'impression. Samsung Internet ignore l'impression déclenchée par un bouton : on y indique
 * le chemin par le menu du navigateur, qui utilise la même mise en page.
 */
export function BoutonImprimer({ libelle = "Imprimer" }: { libelle?: string }) {
  const [aide, setAide] = useState(false);
  return (
    <>
      <button
        type="button"
        className="btn primary sm"
        onClick={() => {
          if (/SamsungBrowser/i.test(navigator.userAgent)) setAide(true);
          else window.print();
        }}
      >
        {libelle}
      </button>
      {aide && (
        <p className="small aide-impression">
          Samsung Internet ne permet pas d&apos;imprimer depuis ce bouton. Ouvrez le menu du navigateur (☰ en bas à droite), puis
          « Imprimer/PDF » : vous pouvez imprimer ou enregistrer les cartes en PDF. Vous pouvez aussi ouvrir cette page dans Chrome.
        </p>
      )}
    </>
  );
}
