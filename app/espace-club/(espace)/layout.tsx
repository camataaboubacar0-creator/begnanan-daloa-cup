import Link from "next/link";
import type { Metadata } from "next";
import { OngletsAdmin } from "@/app/admin/(espace)/OngletsAdmin";
import { quitterEspaceClub } from "@/app/admin/connexion/actions";
import { exigerClub } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Espace club", robots: { index: false } };

export default async function EspaceClub({ children }: { children: React.ReactNode }) {
  const orga = await exigerClub();
  const db = await createClient();
  const [{ data: club }, { count: nonLus }] = await Promise.all([
    db.from("clubs").select("nom, logo_url").eq("id", orga.club_id).single(),
    db.from("messages_club").select("id", { count: "exact", head: true }).eq("club_id", orga.club_id).eq("de_comite", true).eq("lu", false),
  ]);
  const onglets = [
    ["/espace-club", "Mon club"],
    ["/espace-club/joueurs", "Joueurs"],
    ["/espace-club/encadrement", "Encadrement"],
    ["/espace-club/mercato", "Mercato"],
    ["/espace-club/messages", nonLus ? `Messages (${nonLus})` : "Messages"],
    ["/espace-club/cartes", "Cartes"],
  ];
  return (
    <>
      <section className="dash-head">
        <div className="wrap">
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {club?.logo_url && <img className="logo-club" src={club.logo_url} alt="" />}
            <div>
              <div className="eyebrow" style={{ color: "var(--gold)" }}>Espace club · {club?.nom}</div>
              <h2>Bonjour {orga.nom}</h2>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="btn ghost sm" href="/">Voir le site</Link>
            <form action={quitterEspaceClub}><button className="btn ghost sm">Se déconnecter</button></form>
          </div>
        </div>
      </section>
      <section className="band">
        <div className="wrap adm-layout">
          <OngletsAdmin onglets={onglets} label="Espace club" />
          {children}
        </div>
      </section>
    </>
  );
}
