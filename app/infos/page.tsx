import type { Metadata } from "next";
import { getTournoi } from "@/lib/data";
import { dateLongue } from "@/lib/format";
import { FormulaireAlertes } from "./FormulaireAlertes";

export const revalidate = 300;
export const metadata: Metadata = { title: "Infos pratiques" };

export default async function Infos() {
  const tournoi = await getTournoi();
  const carte = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${tournoi.lieu}, Côte d'Ivoire`)}`;
  const aConfirmer = <span className="tbc">à confirmer</span>;

  return (
    <section className="band">
      <div className="wrap">
        <div className="head">
          <div>
            <div className="eyebrow">Infos pratiques</div>
            <h1 className="h2">Venir au stade</h1>
          </div>
        </div>
        <div className="grid g2">
          <div className="card">
            <dl className="info-list">
              <div><dt>Lieu</dt><dd>{tournoi.lieu}</dd></div>
              <div>
                <dt>Dates</dt>
                <dd>Du {dateLongue(tournoi.date_debut)} au {dateLongue(tournoi.date_fin)} {!tournoi.dates_confirmees && aConfirmer}</dd>
              </div>
              <div><dt>Équipes</dt><dd>{tournoi.capacite_clubs} clubs</dd></div>
              <div><dt>Horaires</dt><dd>Selon le calendrier publié {aConfirmer}</dd></div>
              <div><dt>Contact</dt><dd>Comité d&apos;organisation {aConfirmer}</dd></div>
            </dl>
            <a className="btn line" style={{ marginTop: 16 }} href={carte} target="_blank" rel="noopener">Ouvrir l&apos;itinéraire</a>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 6 }}>Alertes WhatsApp</h3>
            <p className="small" style={{ marginBottom: 14 }}>Recevez les résultats et les annonces du comité directement sur votre téléphone.</p>
            <FormulaireAlertes />
          </div>
        </div>
      </div>
    </section>
  );
}
