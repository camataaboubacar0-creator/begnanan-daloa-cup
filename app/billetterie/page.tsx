import type { Metadata } from "next";
import { getCategories, getClubs, getMatchs, getPlacesRestantes, parId } from "@/lib/data";
import { fcfa, heure, jourCourt } from "@/lib/format";

export const revalidate = 30;
export const metadata: Metadata = { title: "Billetterie" };

const TEINTES = ["var(--pitch)", "var(--info)", "var(--gold)", "#8e3b8e", "var(--earth)"];

export default async function Billetterie() {
  const [categories, matchs, clubs] = await Promise.all([getCategories(), getMatchs(), getClubs()]);
  const prochain = matchs.find((m) => m.statut === "programmé");
  const restantes = new Map((prochain ? await getPlacesRestantes(prochain.id) : []).map((r) => [r.categorie_id, r.restantes]));
  const index = parId(clubs);

  return (
    <section className="band">
      <div className="wrap">
        <div className="head">
          <div>
            <div className="eyebrow">Billetterie</div>
            <h1 className="h2">Réservez votre place</h1>
            <p>Paiement par mobile money (Orange Money, MTN MoMo, Moov Money, Wave). Votre e-billet avec QR code sera contrôlé à l&apos;entrée.</p>
          </div>
        </div>
        {categories.length ? (
          <>
            <div className="tk-grid">
              {categories.map((c, i) => {
                const libres = restantes.get(c.id) ?? c.places_par_match;
                const pourcent = c.places_par_match ? ((c.places_par_match - libres) / c.places_par_match) * 100 : 100;
                return (
                  <article key={c.id} className="card tk reveal" style={{ "--tier": TEINTES[i % TEINTES.length] } as React.CSSProperties}>
                    <div><span className="eyebrow" style={{ color: "inherit" }}>Catégorie</span><h3>{c.nom}</h3></div>
                    <div className="tk-price num">{c.prix_fcfa.toLocaleString("fr-FR")}<small> FCFA</small></div>
                    <p className="small">{c.description}</p>
                    <div>
                      <div className="bar"><i style={{ width: `${pourcent}%` }} /></div>
                      <p className="small" style={{ marginTop: 6 }}>
                        {c.places_par_match} places par match{prochain ? ` · ${libres} libres pour le prochain` : ""}
                      </p>
                    </div>
                    <button className="btn primary" disabled title="Ouverture prochaine">Bientôt en vente</button>
                  </article>
                );
              })}
            </div>
            {prochain && (
              <p className="small" style={{ marginTop: 12 }}>
                Prochain match : {index.get(prochain.club_domicile)?.nom} – {index.get(prochain.club_exterieur)?.nom}, {jourCourt(prochain.date_heure)} à {heure(prochain.date_heure)}.
              </p>
            )}
            <p className="small" style={{ marginTop: 6 }}>
              Le paiement en ligne ouvrira dès l&apos;activation du compte marchand. Tarif le plus bas : {fcfa(Math.min(...categories.map((c) => c.prix_fcfa)))}.
            </p>
          </>
        ) : (
          <div className="card vide"><h3>Billetterie fermée</h3><p className="small">Aucune catégorie de place n&apos;est en vente pour le moment.</p></div>
        )}
      </div>
    </section>
  );
}
