import { Formulaire } from "@/components/admin/Formulaire";
import { exigerAcces } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { enregistrerTournoi } from "./actions";

export default async function AdminTournoi() {
  await exigerAcces("tournoi");
  const db = await createClient();
  const { data: t } = await db.from("tournoi").select("*").eq("id", 1).single();
  if (!t) return <p>Paramètres introuvables : la migration a-t-elle été exécutée ?</p>;
  return (
    <div className="card">
      <h3 style={{ marginBottom: 12 }}>Paramètres du tournoi</h3>
      <Formulaire action={enregistrerTournoi}>
        <label className="field">Nom<input name="nom" defaultValue={t.nom} required /></label>
        <label className="field">Lieu<input name="lieu" defaultValue={t.lieu} required /></label>
        <label className="field">Date de début<input name="date_debut" type="date" defaultValue={t.date_debut} required /></label>
        <label className="field">Date de fin<input name="date_fin" type="date" defaultValue={t.date_fin} required /></label>
        <label className="field">Nombre de clubs<input name="capacite_clubs" type="number" min={2} max={64} defaultValue={t.capacite_clubs} /></label>
        <label className="chk"><input name="dates_confirmees" type="checkbox" defaultChecked={t.dates_confirmees} /> Dates confirmées (retire la mention « à confirmer »)</label>
        <label className="field full">Accroche de la page d&apos;accueil<textarea name="accroche" rows={3} defaultValue={t.accroche} /></label>
      </Formulaire>
    </div>
  );
}
