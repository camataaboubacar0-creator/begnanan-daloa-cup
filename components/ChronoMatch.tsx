"use client";

import { useEffect, useRef, useState } from "react";
import { dureePeriode, libellePeriode, minuteDeJeu, secondesJouees, type Chrono, type Durees } from "@/lib/chrono";

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Heure courante, rafraîchie chaque seconde (null avant l'affichage côté téléphone). */
function useMaintenant(actif: boolean) {
  const [maintenant, setMaintenant] = useState<number | null>(null);
  useEffect(() => {
    setMaintenant(Date.now());
    if (!actif) return;
    const t = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(t);
  }, [actif]);
  return maintenant;
}

/** Pages publiques : période et minute de jeu (« 2e mi-temps · 31' »), qui avancent toutes seules. */
export function ChronoPublic({ chrono, durees }: { chrono: Chrono; durees: Durees }) {
  const maintenant = useMaintenant(!!chrono.chrono_lance);
  if (!chrono.periode) return null;
  const minute = !chrono.periode_terminee && maintenant !== null ? minuteDeJeu(chrono, durees, maintenant) : null;
  return (
    <span className="chrono-public">
      {libellePeriode(chrono)}
      {minute && <b className="num"> · {minute.texte}</b>}
    </span>
  );
}

/**
 * Espace comité : le chrono de la période en secondes, avec le temps prévu. Une fois le temps
 * écoulé, il passe en rouge et compte les arrêts de jeu ; le téléphone vibre et l'écran reste allumé.
 */
export function ChronoComite({ chrono, durees }: { chrono: Chrono; durees: Durees }) {
  const maintenant = useMaintenant(!!chrono.chrono_lance);
  const vibre = useRef(false);
  const joue = maintenant === null ? chrono.chrono_ecoule ?? 0 : secondesJouees(chrono, maintenant);
  const duree = chrono.periode ? dureePeriode(chrono.periode, durees) : null;
  const depasse = duree !== null && joue >= duree * 60;

  useEffect(() => {
    if (depasse && chrono.chrono_lance && !vibre.current) navigator.vibrate?.([300, 150, 300]);
    vibre.current = depasse;
  }, [depasse, chrono.chrono_lance]);

  // Écran allumé tant que le chrono tourne (sinon le téléphone se met en veille pendant le match).
  useEffect(() => {
    if (!chrono.chrono_lance || !("wakeLock" in navigator)) return;
    let verrou: WakeLockSentinel | null = null;
    const prendre = () => navigator.wakeLock.request("screen").then((v) => (verrou = v)).catch(() => {});
    const auRetour = () => document.visibilityState === "visible" && prendre();
    prendre();
    document.addEventListener("visibilitychange", auRetour);
    return () => {
      document.removeEventListener("visibilitychange", auRetour);
      verrou?.release().catch(() => {});
    };
  }, [chrono.chrono_lance]);

  if (!chrono.periode || chrono.periode === "tab") return null;
  return (
    <div className={`chrono-comite${depasse ? " depasse" : ""}${chrono.chrono_lance ? "" : " arrete"}`}>
      <span className="small">{libellePeriode(chrono)}{!chrono.chrono_lance && !chrono.periode_terminee ? " · chrono arrêté" : ""}</span>
      <b className="num">{mmss(joue)}</b>
      <span className="small">
        {duree === null
          ? <>Durée <span className="tbc">à confirmer</span></>
          : depasse
            ? <>Temps écoulé · arrêts de jeu + {mmss(joue - duree * 60)}</>
            : <>sur {duree}:00 · reste {mmss(duree * 60 - joue)}</>}
      </span>
    </div>
  );
}
