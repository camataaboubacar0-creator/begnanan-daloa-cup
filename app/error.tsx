"use client";

import Link from "next/link";

/** Affichée quand une page ne peut pas se charger (base de données momentanément indisponible). */
export default function Erreur({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="band">
      <div className="wrap" style={{ maxWidth: 520 }}>
        <div className="card" style={{ textAlign: "center" }}>
          <div className="eyebrow">Connexion</div>
          <h1 className="h2" style={{ margin: "6px 0 12px" }}>Informations momentanément indisponibles</h1>
          <p className="small" style={{ marginBottom: 16 }}>Le site n&apos;arrive pas à charger les dernières informations. Vérifiez votre connexion et réessayez dans un instant.</p>
          <div className="form-row" style={{ justifyContent: "center" }}>
            <button className="btn primary sm" onClick={reset}>Réessayer</button>
            <Link className="btn line sm" href="/">Accueil</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
