import type { Metadata } from "next";
import Link from "next/link";
import { getClubs, getTournoi } from "@/lib/data";
import { FormulaireDemande } from "./FormulaireDemande";

export const revalidate = 300;
export const metadata: Metadata = { title: "Inscrire mon club" };

export default async function InscriptionClub() {
  const [tournoi, clubs] = await Promise.all([getTournoi(), getClubs()]);
  const incluses = tournoi.licences_incluses ?? 10;
  return (
    <section className="band">
      <div className="wrap">
        <div className="head">
          <div>
            <div className="eyebrow">Présidents de club</div>
            <h1 className="h2">Inscrire mon club</h1>
          </div>
          <Link className="btn line sm" href="/espace-club/connexion">Déjà inscrit ? Se connecter</Link>
        </div>
        <div className="grid inscription-grille">
          <div className="card">
            <FormulaireDemande clubs={clubs.map((c) => c.nom).sort((a, b) => a.localeCompare(b, "fr"))} />
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 10 }}>Comment ça marche</h3>
            <ol className="etapes">
              <li><b>Vous remplissez ce formulaire</b> : seuls le club et le président sont obligatoires, avec l&apos;identifiant et le mot de passe que vous choisissez. Le logo, le coach, l&apos;adjoint et les joueurs sont facultatifs : vous pourrez les ajouter ensuite.</li>
              <li><b>Le comité examine la demande</b> et vous contacte sur WhatsApp.</li>
              <li><b>Dès qu&apos;il l&apos;accepte</b>, vous vous connectez à l&apos;espace club avec votre identifiant : vous y gérez vos joueurs, votre encadrement et le profil du club.</li>
              <li><b>Depuis l&apos;espace de votre club</b>, vous complétez le profil, ajoutez ou retirez des joueurs, demandez leurs licences, écrivez au comité et participez au mercato.</li>
              <li><b>Le comité valide chaque licence et chaque carte</b>. Un joueur doit avoir une licence active pour jouer.</li>
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
