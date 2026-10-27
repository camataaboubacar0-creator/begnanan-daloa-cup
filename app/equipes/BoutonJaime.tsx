"use client";

import { useEffect, useState, useTransition } from "react";
import { aimer } from "./actions";

const CLE = "bdc-jaime";

function lus(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CLE) ?? "[]");
  } catch {
    return [];
  }
}

/** « J'aime » du public : un par visiteur, retiré au second appui. */
export function BoutonJaime({ id, nb }: { id: string; nb: number }) {
  const [total, setTotal] = useState(nb);
  const [aime, setAime] = useState(false);
  const [envoi, demarrer] = useTransition();
  useEffect(() => setAime(lus().includes(id)), [id]);

  return (
    <button
      type="button"
      className={`btn ${aime ? "gold" : "line"} sm`}
      aria-pressed={aime}
      disabled={envoi}
      onClick={() =>
        demarrer(async () => {
          const r = await aimer(id);
          if (!r) return;
          setTotal(r.nb);
          setAime(r.aime);
          try {
            const autres = lus().filter((x) => x !== id);
            localStorage.setItem(CLE, JSON.stringify(r.aime ? [...autres, id].slice(-300) : autres));
          } catch {}
        })
      }
    >
      ♥ J&apos;aime · {total}
    </button>
  );
}
