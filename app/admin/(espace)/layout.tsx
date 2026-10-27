import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { exigerAcces, peutVoir } from "@/lib/auth";
import { ROLES } from "@/lib/types";
import { seDeconnecter } from "../connexion/actions";
import { OngletsAdmin } from "./OngletsAdmin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Administration", robots: { index: false } };

const PAGES = [
  ["tournoi", "Tournoi"],
  ["matchs", "Clubs et matchs"],
  ["direct", "Match en direct"],
  ["tirage", "Tirage et calendrier"],
  ["annonces", "Annonces"],
  ["licences", "Inscriptions et licences"],
  ["mercato", "Mercato"],
  ["cartes", "Cartes à imprimer"],
  ["messages", "Messages"],
  ["billets", "Billetterie"],
  ["medias", "Médias"],
  ["comptes", "Comptes"],
] as const;

export default async function EspaceAdmin({ children }: { children: React.ReactNode }) {
  const orga = await exigerAcces();
  // L'espace pro est réservé à l'organisation : les présidents ont l'espace club.
  if (orga.role === "president") redirect("/espace-club");
  const onglets = [["", "Tableau de bord"] as const, ...PAGES.filter(([p]) => peutVoir(orga.role, p))];
  return (
    <>
      <section className="dash-head">
        <div className="wrap">
          <div>
            <div className="eyebrow" style={{ color: "var(--gold)" }}>Espace organisateurs · {ROLES[orga.role].label}</div>
            <h2>Bonjour {orga.nom}</h2>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="btn ghost sm" href="/">Voir le site</Link>
            {peutVoir(orga.role, "club") && <Link className="btn ghost sm" href="/espace-club/connexion">Espace club</Link>}
            <form action={seDeconnecter}><button className="btn ghost sm">Se déconnecter</button></form>
          </div>
        </div>
      </section>
      <section className="band">
        <div className="wrap adm-layout">
          <OngletsAdmin onglets={onglets.map(([p, l]) => [`/admin${p ? `/${p}` : ""}`, l])} />
          {children}
        </div>
      </section>
    </>
  );
}
