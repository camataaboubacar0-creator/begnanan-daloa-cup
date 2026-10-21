"use client";

import { useActionState } from "react";
import type { Etat } from "@/lib/admin";

/** Formulaire d'administration : affiche l'erreur ou la confirmation renvoyée par l'action serveur. */
export function Formulaire({
  action,
  children,
  bouton = "Enregistrer",
  className = "form-grid",
  confirmer,
}: {
  action: (etat: Etat, form: FormData) => Promise<Etat>;
  children: React.ReactNode;
  bouton?: string;
  className?: string;
  confirmer?: string;
}) {
  const [etat, envoyer, envoi] = useActionState(action, {});
  return (
    <form
      action={envoyer}
      className={className}
      onSubmit={(e) => {
        if (confirmer && !window.confirm(confirmer)) e.preventDefault();
      }}
    >
      {children}
      <div className="form-actions">
        <button className="btn primary sm" disabled={envoi}>{envoi ? "Enregistrement…" : bouton}</button>
        {etat.erreur && <span className="form-err">{etat.erreur}</span>}
        {etat.ok && <span className="form-ok">{etat.ok}</span>}
      </div>
    </form>
  );
}
