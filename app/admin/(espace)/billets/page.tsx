import { Formulaire } from "@/components/admin/Formulaire";
import { exigerAcces } from "@/lib/auth";
import { fcfa } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { CategorieBillet } from "@/lib/types";
import { ajouterCategorie, controlerBillet, modifierCategorie, supprimerCategorie } from "./actions";

function ChampsCategorie({ c }: { c?: CategorieBillet }) {
  return (
    <>
      <label className="field">Nom<input name="nom" defaultValue={c?.nom} required /></label>
      <label className="field">Prix (FCFA)<input name="prix_fcfa" type="number" min={0} step={100} defaultValue={c?.prix_fcfa ?? 1000} required /></label>
      <label className="field">Places par match<input name="places_par_match" type="number" min={0} defaultValue={c?.places_par_match ?? 100} required /></label>
      <label className="field">Ordre d&apos;affichage<input name="ordre" type="number" defaultValue={c?.ordre ?? 0} /></label>
      <label className="field full">Description<input name="description" defaultValue={c?.description} /></label>
      <label className="chk"><input name="en_vente" type="checkbox" defaultChecked={c?.en_vente} /> En vente sur le site</label>
    </>
  );
}

export default async function AdminBillets() {
  await exigerAcces("billets");
  const db = await createClient();
  const [{ data: categories }, { data: commandes }] = await Promise.all([
    db.from("categories_billet").select("*").order("ordre"),
    db.from("commandes").select("reference, nom_acheteur, quantite, total_fcfa, statut, entrees_validees, cree_le").order("cree_le", { ascending: false }).limit(50),
  ]);

  return (
    <>
      <div className="card">
        <h3 style={{ marginBottom: 6 }}>Contrôle à l&apos;entrée</h3>
        <p className="small" style={{ marginBottom: 12 }}>Saisissez la référence imprimée sous le QR code. Chaque passage est enregistré une seule fois.</p>
        <Formulaire action={controlerBillet} bouton="Valider l'entrée" className="form-row">
          <label className="field">Référence<input name="reference" required autoComplete="off" autoCapitalize="characters" placeholder="BDC-XXXXXX" /></label>
        </Formulaire>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Catégories et prix</h3>
        <div className="adm-list">
          {((categories ?? []) as CategorieBillet[]).map((c) => (
            <details key={c.id} className="adm-item">
              <summary><b>{c.nom}</b> <span className="small">{fcfa(c.prix_fcfa)} · {c.places_par_match} places · {c.en_vente ? "en vente" : "hors vente"}</span></summary>
              <Formulaire action={modifierCategorie}>
                <input type="hidden" name="id" value={c.id} />
                <ChampsCategorie c={c} />
              </Formulaire>
              <Formulaire action={supprimerCategorie} className="form-del" bouton="Supprimer" confirmer={`Supprimer la catégorie ${c.nom} ?`}>
                <input type="hidden" name="id" value={c.id} />
              </Formulaire>
            </details>
          ))}
        </div>
        <details style={{ marginTop: 16 }}>
          <summary className="btn line sm">Ajouter une catégorie</summary>
          <div style={{ marginTop: 12 }}>
            <Formulaire action={ajouterCategorie} bouton="Ajouter"><ChampsCategorie /></Formulaire>
          </div>
        </details>
        <p className="small" style={{ marginTop: 12 }}>Un changement de prix s&apos;applique aux nouvelles ventes uniquement.</p>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Dernières commandes</h3>
        {commandes?.length ? (
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Référence</th><th>Acheteur</th><th className="n">Billets</th><th className="n">Montant</th><th>Statut</th><th className="n">Entrées</th></tr></thead>
              <tbody>
                {commandes.map((c) => (
                  <tr key={c.reference}>
                    <td className="mono">{c.reference}</td><td>{c.nom_acheteur}</td><td className="n">{c.quantite}</td>
                    <td className="n">{fcfa(c.total_fcfa)}</td><td>{c.statut}</td><td className="n">{c.entrees_validees}/{c.quantite}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="small">Aucune commande pour le moment. Le paiement en ligne arrivera dans la prochaine version.</p>
        )}
      </div>
    </>
  );
}
