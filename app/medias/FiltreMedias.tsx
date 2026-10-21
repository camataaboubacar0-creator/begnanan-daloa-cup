"use client";

import { useState } from "react";

const ONGLETS = [["", "Tout"], ["debrief", "Débriefs"], ["annonce", "Annonces"], ["hdm", "Hommes du match"]];

/** Onglets de filtre : les cartes sont rendues par le serveur, on masque seulement celles hors filtre. */
export function FiltreMedias({ children }: { children: React.ReactNode }) {
  const [type, setType] = useState("");
  return (
    <>
      <div className="tabs" role="tablist">
        {ONGLETS.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={type === k} onClick={() => setType(k)} style={{ fontFamily: "var(--f-body)", fontSize: ".88rem" }}>
            {l}
          </button>
        ))}
      </div>
      <div className="grid g3 filtre-medias" data-filtre={type}>{children}</div>
    </>
  );
}
