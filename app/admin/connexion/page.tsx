import type { Metadata } from "next";
import { Formulaire } from "./Formulaire";

export const metadata: Metadata = { title: "Connexion organisateurs", robots: { index: false } };

export default async function Connexion({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const { suite = "/admin" } = await searchParams;
  return (
    <section className="band">
      <div className="wrap" style={{ maxWidth: 420 }}>
        <div className="card">
          <div className="eyebrow">Espace organisateurs</div>
          <h1 className="h2" style={{ margin: "6px 0 18px" }}>Connexion</h1>
          <Formulaire suite={suite} />
          <p className="small" style={{ marginTop: 14 }}>Les comptes sont créés par l&apos;administrateur du tournoi.</p>
        </div>
      </div>
    </section>
  );
}
