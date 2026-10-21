"use client";

export function BoutonImprimer({ libelle = "Imprimer" }: { libelle?: string }) {
  return <button type="button" className="btn primary sm" onClick={() => window.print()}>{libelle}</button>;
}
