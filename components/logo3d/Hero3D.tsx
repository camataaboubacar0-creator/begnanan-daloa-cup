"use client";

import { useEffect, useRef, useState } from "react";

function webglDisponible() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Bandeau vert d'accueil avec le logo en relief 3D au-dessus d'un terrain de football.
 * Le logo s'aligne sur l'élément [data-logo-3d] du contenu ; tant que la 3D n'est pas prête
 * (ou si l'appareil ne la permet pas), c'est l'image du logo qui reste affichée.
 */
export function Hero3D({ children }: { children: React.ReactNode }) {
  const zone = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [pret, setPret] = useState(false);

  // Progression du défilement à travers le bandeau (0 en haut, 1 quand il est sorti), pour la profondeur en CSS.
  useEffect(() => {
    const z = zone.current;
    if (!z || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let id = 0;
    const maj = () => {
      id = 0;
      z.style.setProperty("--defil", Math.min(1, Math.max(0, -z.getBoundingClientRect().top / z.clientHeight)).toFixed(3));
    };
    const defiler = () => (id ||= requestAnimationFrame(maj));
    window.addEventListener("scroll", defiler, { passive: true });
    return () => {
      window.removeEventListener("scroll", defiler);
      cancelAnimationFrame(id);
    };
  }, []);

  useEffect(() => {
    const z = zone.current, c = canvas.current;
    const emplacement = z?.querySelector<HTMLElement>("[data-logo-3d]");
    if (!z || !c || !emplacement || !webglDisponible()) return;
    const calme = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let annule = false;
    let nettoyer = () => {};

    import("./scene").then(({ creerLogo3D }) => {
      if (annule) return;
      const s = creerLogo3D({ canvas: c, zone: z, emplacement, image: "/logo.webp", animations: !calme, pret: () => setPret(true) });
      const io = new IntersectionObserver(([e]) => s.visibilite(e.isIntersecting));
      io.observe(z);
      const bouger = (e: PointerEvent) => s.souris(e.clientX, e.clientY);
      const defiler = () => s.defiler(Math.min(1, Math.max(0, -z.getBoundingClientRect().top / z.clientHeight)));
      window.addEventListener("pointermove", bouger, { passive: true });
      window.addEventListener("scroll", defiler, { passive: true });
      nettoyer = () => {
        io.disconnect();
        window.removeEventListener("pointermove", bouger);
        window.removeEventListener("scroll", defiler);
        s.detruire();
      };
    });
    return () => {
      annule = true;
      nettoyer();
    };
  }, []);

  return (
    <section className="hero" ref={zone} data-3d={pret ? "pret" : undefined}>
      <canvas ref={canvas} className="hero-3d" aria-hidden="true" />
      {children}
    </section>
  );
}
