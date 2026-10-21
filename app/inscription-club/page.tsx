import type { Metadata } from "next";
import Link from "next/link";
import { getTournoi } from "@/lib/data";
import { FormulaireDemande } from "./FormulaireDemande";

export const revalidate = 300;
export const metadata: Metadata = { title: "Inscrire mon club" };

export default async function InscriptionClub() {
  const tournoi = await getTournoi();
  const incluses = tournoi.licences_incluses ?? 10;
  return (
    <section className="band">
      <div className="wrap">
        <div className="head">
          <div>
            <div className="eyebrow">Présidents de club</div>
            <h1 className="h2">Inscrire mon club</h1>
          </div>
          <Link className="btn line sm" href="/admin/connexion">Déjà inscrit ? Se connecter</Link>
        </div>
        <div className="grid g2" style={{ alignItems: "start" }}>
          <div className="card">
            <FormulaireDemande />
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 10 }}>Comment ça marche</h3>
            <ol className="etapes">
              <li><b>Vous envoyez la demande</b> avec ce formulaire.</li>
              <li><b>Le comité l&apos;examine</b> et vous contacte sur WhatsApp.</li>
              <li><b>Vous recevez vos identifiants</b> pour l&apos;espace de votre club.</li>
              <li><b>Vous inscrivez vos joueurs</b> et demandez leurs licences.</li>
              <li><b>Le comité valide chaque licence</b>. Un joueur doit avoir une licence active pour jouer.</li>
            </ol>
            <h3 style={{ margin: "18px 0 6px" }}>Licences</h3>
            <p className="small">
              {incluses} licences sont incluses par club. À partir de la {incluses + 1}ᵉ, chaque licence est facturée
              {tournoi.tarif_licence_fcfa != null ? ` ${tournoi.tarif_licence_fcfa.toLocaleString("fr-FR")} FCFA` : <> au tarif fixé par le comité <span className="tbc">à confirmer</span></>}.
            </p>
            <p className="small">Frais d&apos;inscription du club : <span className="tbc">à confirmer</span></p>
          </div>
        </div>
      </div>
    </section>
  );
}
