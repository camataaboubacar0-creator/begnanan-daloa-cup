"use client";

import { useEffect } from "react";

/** Enregistre le mode hors ligne (public/sw.js), seulement sur le site en ligne. */
export function EnregistrementHorsLigne() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
