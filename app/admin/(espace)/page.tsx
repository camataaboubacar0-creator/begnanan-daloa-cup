import Link from "next/link";
import { Formulaire } from "@/components/admin/Formulaire";
import { exigerAcces, peutVoir } from "@/lib/auth";
import { fcfa } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { changerMotDePasse } from "./actions";

function MotDePasse() {
  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <h3 style={{ marginBottom: 12 }}>Mon mot de passe</h3>
      <Formulaire action={changerMotDePasse} bouton="Changer le mot de passe">
        <label className="field">Nouveau mot de passe<input name="motdepasse" type="password" minLength={10} required autoComplete="new-password" /></label>
        <label className="field">Confirmation<input name="confirmation" type="password" minLength={10} required autoComplete="new-password" /></label>
      </Formulaire>
    </div>
  );
}

export default async function TableauDeBord() {
  const orga = await exigerAcces();
  const db = await createClient();
  if (orga.role === "president") {
    const { data } = await db.from("joueurs").select("etat");
    const n = (e: string) => (data ?? []).filter((j) => j.etat === e).length;
    return (
      <>
        <div className="grid g4">
          {([["Licences actives", n("active")], ["En attente du comité", n("soumise")], ["Brouillons", n("brouillon")], ["À corriger", n("refusée")]] as const).map(([k, v]) => (
            <div key={k} className="card">
              <div className="kpi"><span className="k">{k}</span><span className="v num">{v}</span></div>
              <Link className="small" href="/admin/club">Ouvrir</Link>
            </div>
          ))}
        </div>
        <MotDePasse />
      </>
    );
  }
  const [clubs, matchs, commandes] = await Promise.all([
    db.from("clubs").select("id", { count: "exact", head: true }),
    db.from("matchs").select("statut, resultat_valide"),
    peutVoir(orga.role, "billets") ? db.from("commandes").select("quantite, total_fcfa").eq("statut", "payée") : Promise.resolve({ data: [] }),
  ]);
  const liste = matchs.data ?? [];
  const aValider = liste.filter((m) => m.statut === "terminé" && !m.resultat_valide).length;
  const ventes = commandes.data ?? [];

  const kpis: [string, string | number, string?][] = [
    ["Clubs inscrits", clubs.count ?? 0],
    ["Matchs joués", liste.filter((m) => m.statut === "terminé").length],
    ["Résultats à valider", aValider, peutVoir(orga.role, "matchs") ? "/admin/matchs" : undefined],
  ];
  if (peutVoir(orga.role, "licences")) {
    const [demandes, licences] = await Promise.all([
      db.from("demandes_club").select("id", { count: "exact", head: true }).eq("statut", "en attente"),
      db.from("joueurs").select("id", { count: "exact", head: true }).eq("etat", "soumise"),
    ]);
    kpis.push(["Demandes d'inscription", demandes.count ?? 0, "/admin/licences"], ["Licences à contrôler", licences.count ?? 0, "/admin/licences"]);
  }
  if (peutVoir(orga.role, "billets")) {
    kpis.push(["Billets vendus", ventes.reduce((s, c) => s + c.quantite, 0)], ["Recettes", fcfa(ventes.reduce((s, c) => s + c.total_fcfa, 0))]);
  }

  return (
    <>
      <div className="grid g4">
        {kpis.map(([k, v, lien]) => (
          <div key={k} className="card">
            <div className="kpi"><span className="k">{k}</span><span className="v num">{v}</span></div>
            {lien && <Link className="small" href={lien}>Ouvrir</Link>}
          </div>
        ))}
      </div>
      <MotDePasse />
    </>
  );
}
