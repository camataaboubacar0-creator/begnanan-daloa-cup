import Link from "next/link";
import type { Metadata } from "next";
import { Formulaire } from "@/app/admin/connexion/Formulaire";

export const metadata: Metadata = { title: "Connexion espace club", robots: { index: false } };

export default async function ConnexionClub({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const { suite = "/espace-club" } = await searchParams;
  return (
    <section className="band">
      <div className="wrap" style={{ maxWidth: 420 }}>
        <div className="card">
          <div className="eyebrow">Espace club · présidents de club</div>
          <h1 className="h2" style={{ margin: "6px 0 18px" }}>Connexion</h1>
          <Formulaire suite={suite} />
          <p className="small" style={{ marginTop: 14 }}>
            Pas encore de compte ? Il se crée avec la <Link href="/inscription-club">demande d&apos;inscription du club</Link> et s&apos;ouvre dès que le comité l&apos;accepte.
          </p>
        </div>
      </div>
    </section>
  );
}
