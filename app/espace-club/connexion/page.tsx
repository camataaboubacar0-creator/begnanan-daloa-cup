import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Formulaire } from "@/app/admin/connexion/Formulaire";
import { quitterEspaceClub } from "@/app/admin/connexion/actions";
import { getOrganisateur } from "@/lib/auth";

export const metadata: Metadata = { title: "Connexion espace club", robots: { index: false } };

export default async function ConnexionClub({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const { suite = "/espace-club" } = await searchParams;
  const orga = await getOrganisateur();
  if (orga?.role === "president" && orga.club_id) redirect("/espace-club");

  // Compte de l'organisation : l'espace club n'est pas le sien.
  if (orga) {
    return (
      <section className="band">
        <div className="wrap" style={{ maxWidth: 480 }}>
          <div className="card">
            <div className="eyebrow">Espace club · présidents de club</div>
            <h1 className="h2" style={{ margin: "6px 0 12px" }}>Réservé aux présidents de club</h1>
            <p>
              Vous êtes connecté avec le compte de l&apos;organisation <b>{orga.nom}</b>. L&apos;espace club sert aux présidents
              pour gérer leur club, leurs joueurs et leurs licences ; votre compte, lui, donne accès à l&apos;Espace pro.
            </p>
            <div className="form-row" style={{ marginTop: 16 }}>
              <Link className="btn primary sm" href="/admin">Aller à l&apos;Espace pro</Link>
              <form action={quitterEspaceClub}><button className="btn line sm">Se déconnecter pour entrer comme président</button></form>
            </div>
          </div>
        </div>
      </section>
    );
  }

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
