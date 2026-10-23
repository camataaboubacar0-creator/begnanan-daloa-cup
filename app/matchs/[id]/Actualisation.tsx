"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Match en cours : recharge le score toutes les 20 secondes, sans recharger la page. */
export function Actualisation() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 20_000);
    return () => clearInterval(t);
  }, [router]);
  return <span className="small">Mise à jour automatique</span>;
}
