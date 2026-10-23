import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page introuvable", robots: { index: false } };

export default function Introuvable() {
  return (
    <section className="band">
      <div className="wrap" style={{ maxWidth: 520 }}>
        <div className="card" style={{ textAlign: "center" }}>
          <div className="eyebrow">Erreur 404</div>
          <h1 className="h2" style={{ margin: "6px 0 12px" }}>Page introuvable</h1>
          <p className="small" style={{ marginBottom: 16 }}>Cette page n&apos;existe pas ou a été déplacée. Vérifiez l&apos;adresse, ou repartez de l&apos;accueil.</p>
          <div className="form-row" style={{ justifyContent: "center" }}>
            <Link className="btn primary sm" href="/">Accueil</Link>
            <Link className="btn line sm" href="/matchs">Matchs</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
