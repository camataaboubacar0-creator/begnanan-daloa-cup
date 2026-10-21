"use client";

import { useActionState } from "react";
import { inscrireAlerte, type EtatAlerte } from "./actions";

export function FormulaireAlertes() {
  const [etat, action, envoi] = useActionState<EtatAlerte, FormData>(inscrireAlerte, {});
  if (etat.ok) return <p style={{ fontWeight: 600 }}>C&apos;est noté : vous recevrez les résultats et annonces sur WhatsApp.</p>;
  return (
    <form action={action} className="form-grid">
      <label className="field">Prénom (facultatif)<input name="nom" autoComplete="given-name" /></label>
      <label className="field">Numéro WhatsApp<input name="telephone" type="tel" inputMode="tel" required autoComplete="tel" /></label>
      {etat.erreur && <p className="form-err">{etat.erreur}</p>}
      <button className="btn primary" disabled={envoi}>{envoi ? "Inscription…" : "Recevoir les alertes"}</button>
    </form>
  );
}
