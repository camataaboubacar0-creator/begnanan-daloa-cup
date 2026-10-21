"use client";
import { useEffect, useState } from "react";

const UNITES = ["jours", "heures", "min", "sec"];

export function Countdown({ cible }: { cible: string }) {
  const [reste, setReste] = useState<number | null>(null);
  useEffect(() => {
    const t = new Date(cible).getTime();
    const tick = () => setReste(Math.max(0, (t - Date.now()) / 1000));
    tick();
    const h = setInterval(tick, 1000);
    return () => clearInterval(h);
  }, [cible]);
  const v = reste === null ? null : [reste / 86400, (reste % 86400) / 3600, (reste % 3600) / 60, reste % 60].map(Math.floor);
  return (
    <div className="count">
      {UNITES.map((u, i) => (
        <div key={u}>
          <b>{v ? String(v[i]).padStart(2, "0") : "--"}</b>
          <span>{u}</span>
        </div>
      ))}
    </div>
  );
}
