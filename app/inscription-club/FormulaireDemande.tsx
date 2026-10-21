"use client";

import { useActionState } from "react";
import { deposerDemande, type EtatDemande } from "./actions";

export function FormulaireDemande() {
  const [etat, action, envoi] = useActionState<EtatDemande, FormData>(deposerDemande, {});
  if (etat.ok)
    return (
      <div>
        <h3 style={{ marginBottom: 6 }}>Demande envoyée</h3>
        <p>Le comité d&apos;organisation va l&apos;examiner. S&apos;il l&apos;accepte, il vous transmettra vos identifiants pour accéder à l&apos;espace de votre club et y inscrire vos joueurs.</p>
      </div>
    );
  return (
    <form action={action} className="form-grid">
      <label className="field">Nom du club<input name="nom_club" required minLength={2} maxLength={60} /></label>
      <label className="field">Quartier<input name="quartier" maxLength={60} /></label>
      <label className="field">Nom du président<input name="president_nom" required minLength={2} maxLength={80} autoComplete="name" /></label>
      <label className="field">Numéro WhatsApp<input name="telephone" type="tel" inputMode="tel" required autoComplete="tel" /></label>
      <label className="field full">E-mail (servira à vous connecter)<input name="email" type="email" required autoComplete="email" /></label>
      <label className="field full">Message pour le comité (facultatif)<textarea name="message" rows={3} maxLength={500} /></label>
      {etat.erreur && <p className="form-err full">{etat.erreur}</p>}
      <div className="form-actions"><button className="btn primary" disabled={envoi}>{envoi ? "Envoi…" : "Envoyer la demande"}</button></div>
    </form>
  );
}
