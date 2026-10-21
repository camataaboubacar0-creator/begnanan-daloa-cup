import Link from "next/link";
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
  ["tirage", "Tirage et calendrier"],
  ["annonces", "Annonces"],
  ["licences", "Inscriptions et licences"],
  ["club", "Mon club"],
  ["mercato", "Mercato"],
  ["cartes", "Cartes à imprimer"],
  ["billets", "Billetterie"],
  ["medias", "Médias"],
  ["comptes", "Comptes"],
] as const;

export default async function EspaceAdmin({ children }: { children: React.ReactNode }) {
  const orga = await exigerAcces();
  const onglets = [["", "Tableau de bord"] as const, ...PAGES.filter(([p]) => peutVoir(orga.role, p))];
  return (
    <>
      <section className="dash-head">
        <div className="wrap">
          <div>
            <div className="eyebrow" style={{ color: "var(--gold)" }}>{orga.role === "president" ? "Espace club" : "Espace organisateurs"} · {ROLES[orga.role].label}</div>
            <h2>Bonjour {orga.nom}</h2>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="btn ghost sm" href="/">Voir le site</Link>
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
