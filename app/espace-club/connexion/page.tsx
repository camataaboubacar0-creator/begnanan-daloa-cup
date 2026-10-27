import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Formulaire } from "@/app/admin/connexion/Formulaire";
import { quitterEspaceClub } from "@/app/admin/connexion/actions";
import { getOrganisateur, peutVoir } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { consulterClub } from "./actions";

export const metadata: Metadata = { title: "Connexion espace club", robots: { index: false } };

export default async function ConnexionClub({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const { suite = "/espace-club" } = await searchParams;
  const orga = await getOrganisateur();
  if (orga?.role === "president" && orga.club_id) redirect("/espace-club");

  // Comité et administrateur : ils choisissent le club dont ils ouvrent l'espace.
  if (orga && peutVoir(orga.role, "club")) {
    const { data } = await (await createClient()).from("clubs").select("id, nom, poule").order("nom");
    const clubs = data ?? [];
    return (
      <section className="band">
        <div className="wrap" style={{ maxWidth: 560 }}>
          <div className="card">
            <div className="eyebrow">Espace club · membres du comité</div>
            <h1 className="h2" style={{ margin: "6px 0 12px" }}>Ouvrir l&apos;espace d&apos;un club</h1>
            <p className="small" style={{ marginBottom: 14 }}>
              Vous voyez l&apos;espace comme son président : joueurs, encadrement, messages et cartes. Vos messages y sont signés par le comité.
            </p>
            {!clubs.length && <p className="small">Aucun club inscrit pour l&apos;instant.</p>}
            <div className="adm-list">
              {clubs.map((c) => (
                <form key={c.id} action={consulterClub} className="adm-item choix-club">
                  <input type="hidden" name="club_id" value={c.id} />
                  <span><b>{c.nom}</b>{c.poule && <span className="small"> · Poule {c.poule}</span>}</span>
                  <button className="btn line sm">Ouvrir</button>
                </form>
              ))}
            </div>
            <Link className="btn ghost sm" style={{ marginTop: 14 }} href="/admin">← Retour à l&apos;Espace pro</Link>
          </div>
        </div>
      </section>
    );
  }

  // Autres comptes de l'organisation (billetterie, médias) : l'espace club n'est pas le leur.
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
        <div className="card supporters">
          <div className="eyebrow">Supporters et visiteurs</div>
          <p style={{ margin: "6px 0 10px" }}>Parcourez les clubs : leurs actualités, leurs joueurs et leurs matchs. Aucun compte n&apos;est nécessaire.</p>
          <Link className="btn primary sm" href="/equipes">Voir les clubs</Link>
        </div>
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
