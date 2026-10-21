"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Stade } from "./stade";

const DUREE = 7000;

function webglDisponible() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Scène 3D d'accueil : trophée, poules et terrain, présentés en trois vues
 * qui défilent toutes seules (pastilles et bouton pause, comme un carrousel).
 */
export function Scene3D({ legendes, couleurs, poules }: { legendes: string[]; couleurs: string[]; poules: string[] }) {
  const cadre = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const calque = useRef<HTMLDivElement>(null);
  const stade = useRef<Stade | null>(null);
  const [vue, setVue] = useState(0);
  const [lecture, setLecture] = useState(true);
  const [etat, setEtat] = useState<"chargement" | "pret" | "secours">("chargement");
  const [debut, setDebut] = useState(0);

  // Création de la scène (three.js n'est chargé qu'ici, côté navigateur).
  useEffect(() => {
    const el = canvas.current;
    if (!el || !webglDisponible()) {
      setEtat("secours");
      return;
    }
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (calm) setLecture(false);
    let annule = false;
    let nettoyer = () => {};

    import("./stade").then(({ creerStade }) => {
      if (annule) return;
      const sombre =
        document.documentElement.dataset.theme === "dark" ||
        (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
      const s = creerStade({ canvas: el, couleursClubs: couleurs, poules, sombre, animations: !calm });
      stade.current = s;

      // Étiquettes flottantes positionnées à chaque image.
      s.surCadre((v) => {
        const boite = calque.current;
        if (!boite) return;
        s.etiquettes.forEach((e, i) => {
          const noeud = boite.children[i] as HTMLElement | undefined;
          if (!noeud) return;
          const { x, y, dedans } = s.ecran(e);
          noeud.style.transform = `translate3d(${x}px, ${y}px, 0)`;
          noeud.dataset.on = String(e.vue === v && dedans);
        });
      });

      const io = new IntersectionObserver(([entree]) => s.visibilite(entree.isIntersecting), { threshold: 0.01 });
      io.observe(el);
      const visibiliteOnglet = () => s.visibilite(!document.hidden);
      document.addEventListener("visibilitychange", visibiliteOnglet);
      const bouger = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        s.souris(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
      };
      const defiler = () => {
        const r = el.getBoundingClientRect();
        s.defiler(Math.min(1, Math.max(0, -r.top / r.height)));
      };
      window.addEventListener("pointermove", bouger, { passive: true });
      window.addEventListener("scroll", defiler, { passive: true });
      setEtat("pret");
      setDebut(performance.now());

      nettoyer = () => {
        io.disconnect();
        document.removeEventListener("visibilitychange", visibiliteOnglet);
        window.removeEventListener("pointermove", bouger);
        window.removeEventListener("scroll", defiler);
        s.detruire();
        stade.current = null;
      };
    });
    return () => {
      annule = true;
      nettoyer();
    };
    // La scène est créée une seule fois ; les données ne changent pas après le rendu serveur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Défilement automatique des vues.
  useEffect(() => {
    stade.current?.allerA(vue);
    if (!lecture || etat !== "pret") return;
    const t = setTimeout(() => {
      setVue((v) => (v + 1) % legendes.length);
      setDebut(performance.now());
    }, DUREE);
    return () => clearTimeout(t);
  }, [vue, lecture, etat, debut, legendes.length]);

  const choisir = (i: number) => {
    setVue(i);
    setDebut(performance.now());
  };

  return (
    <div className="stage" ref={cadre} data-etat={etat}>
      <div className="stage-cadre">
        {etat === "secours" ? (
          <div className="stage-secours">
            <Image src="/logo.webp" alt="Logo officiel BÊGNANAN DALOA CUP" width={600} height={587} priority />
          </div>
        ) : (
          <canvas ref={canvas} aria-hidden="true" />
        )}
        <div className="stage-legendes" aria-live="polite">
          {legendes.map((l, i) => (
            <p key={l} className="stage-legende" data-on={i === vue}>
              {l}
            </p>
          ))}
        </div>
        <div className="stage-etiquettes" ref={calque} aria-hidden="true">
          {etat === "pret" && stade.current?.etiquettes.map((e, i) => <span key={i}>{e.texte}</span>)}
        </div>
        <div className="stage-coin haut-gauche mono" aria-hidden="true">// Daloa, Côte d&apos;Ivoire<br />Tournoi de maracana</div>
        <div className="stage-coin bas-gauche mono" aria-hidden="true">Défilez pour découvrir ↓</div>
      </div>
      {etat !== "secours" && (
        <div className="stage-controles">
          <div className="stage-pastilles" role="tablist" aria-label="Vues de la scène">
            {legendes.map((l, i) => (
              <button
                key={l}
                role="tab"
                aria-selected={i === vue}
                aria-label={l}
                onClick={() => choisir(i)}
                style={{ "--duree": `${DUREE}ms` } as React.CSSProperties}
                data-lecture={lecture}
                // La clé change à chaque vue pour relancer l'animation de progression.
              >
                <i key={`${vue}-${debut}`} />
              </button>
            ))}
          </div>
          <button className="stage-pause" onClick={() => setLecture(!lecture)} aria-label={lecture ? "Mettre en pause" : "Lire"}>
            {lecture ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
