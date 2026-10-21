import type { Metadata } from "next";
import { Formulaire } from "./Formulaire";

export const metadata: Metadata = { title: "Connexion espace pro", robots: { index: false } };

export default async function Connexion({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const { suite = "/admin" } = await searchParams;
  return (
    <section className="band">
      <div className="wrap" style={{ maxWidth: 420 }}>
        <div className="card">
          <div className="eyebrow">Espace pro · membres de l'organisation</div>
          <h1 className="h2" style={{ margin: "6px 0 18px" }}>Connexion</h1>
          <Formulaire suite={suite} />
          <p className="small" style={{ marginTop: 14 }}>
            Président de club ? Connectez-vous à l&apos;<a href="/espace-club/connexion">espace club</a>.
          </p>
        </div>
      </div>
    </section>
  );
}
