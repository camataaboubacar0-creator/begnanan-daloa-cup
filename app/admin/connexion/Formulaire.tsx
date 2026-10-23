"use client";

import { useActionState } from "react";
import { seConnecter } from "./actions";

export function Formulaire({ suite }: { suite: string }) {
  const [etat, action, envoi] = useActionState(seConnecter, {});
  return (
    <form action={action} style={{ display: "grid", gap: 12 }}>
      <input type="hidden" name="suite" value={suite} />
      <label className="field">E-mail ou nom d&apos;utilisateur<input name="email" required autoComplete="username" autoCapitalize="none" spellCheck={false} /></label>
      <label className="field">Mot de passe<input name="motdepasse" type="password" required autoComplete="current-password" /></label>
      {etat.erreur && <p className="form-err">{etat.erreur}</p>}
      <button className="btn primary" disabled={envoi}>{envoi ? "Connexion…" : "Se connecter"}</button>
      <p className="small">Mot de passe oublié ? Contactez le comité : il vous remet un mot de passe provisoire.</p>
    </form>
  );
}
