"use client";

import { useActionState, useState } from "react";
import { ChampPhoto } from "@/components/ChampPhoto";
import { deposerDemande, type EtatDemande } from "./actions";

const POSTES = ["Gardien", "Défenseur", "Milieu", "Attaquant"];

function Encadrant({ cle, titre }: { cle: "coach" | "adjoint"; titre: string }) {
  return (
    <fieldset className="bloc-form">
      <legend>{titre}</legend>
      <div className="form-grid">
        <label className="field">Nom<input name={`${cle}_nom`} maxLength={60} /></label>
        <label className="field">Prénoms<input name={`${cle}_prenoms`} maxLength={80} /></label>
        <label className="field">Téléphone<input name={`${cle}_telephone`} type="tel" inputMode="tel" maxLength={20} /></label>
        <ChampPhoto name={`${cle}_photo`} label="Photo" />
      </div>
    </fieldset>
  );
}

export function FormulaireDemande() {
  const [etat, action, envoi] = useActionState<EtatDemande, FormData>(deposerDemande, {});
  // Clés stables des lignes de joueurs (ajout et retrait sans perdre la saisie des autres).
  const [joueurs, setJoueurs] = useState<number[]>([]);
  const [suivant, setSuivant] = useState(0);

  if (etat.ok)
    return (
      <div>
        <h3 style={{ marginBottom: 6 }}>Demande envoyée</h3>
        <p>
          Le comité d&apos;organisation va l&apos;examiner et vous contactera sur WhatsApp. Dès qu&apos;il l&apos;accepte, connectez-vous à
          l&apos;<a href="/espace-club/connexion">espace club</a> avec <b>{etat.identifiant}</b> et le mot de passe que vous avez choisi.
        </p>
      </div>
    );

  return (
    <form action={action} className="form-inscription">
      <fieldset className="bloc-form">
        <legend>1. Le club</legend>
        <div className="form-grid">
          <label className="field">Nom du club<input name="nom_club" required minLength={2} maxLength={60} /></label>
          <label className="field">Quartier<input name="quartier" maxLength={60} /></label>
          <ChampPhoto name="logo" label="Logo du club (facultatif)" />
        </div>
      </fieldset>

      <fieldset className="bloc-form">
        <legend>2. Le président</legend>
        <div className="form-grid">
          <label className="field">Nom<input name="president_nom" required minLength={2} maxLength={60} autoComplete="family-name" /></label>
          <label className="field">Prénoms<input name="president_prenoms" required maxLength={80} autoComplete="given-name" /></label>
          <label className="field">Numéro WhatsApp<input name="telephone" type="tel" inputMode="tel" required autoComplete="tel" /></label>
          <ChampPhoto name="president_photo" label="Photo du président (pour sa carte)" />
        </div>
      </fieldset>

      <fieldset className="bloc-form">
        <legend>3. Votre compte</legend>
        <p className="small" style={{ margin: "0 0 10px" }}>
          Pour vous connecter à l&apos;espace de votre club : une adresse e-mail ou un nom d&apos;utilisateur (par exemple <i>lions.lobia</i>), et un mot de passe que vous choisissez.
        </p>
        <div className="form-grid">
          <label className="field full">E-mail ou nom d&apos;utilisateur<input name="identifiant" required autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={120} /></label>
          <label className="field">Mot de passe (8 caractères minimum)<input name="motdepasse" type="password" required minLength={8} autoComplete="new-password" /></label>
          <label className="field">Confirmation<input name="confirmation" type="password" required minLength={8} autoComplete="new-password" /></label>
        </div>
      </fieldset>

      <details className="bloc-facultatif">
        <summary>
          <b>Facultatif : coach, adjoint et joueurs</b>
          <span className="small">Vous pouvez les ajouter maintenant ou plus tard, depuis l&apos;espace de votre club.</span>
        </summary>
      <Encadrant cle="coach" titre="4. Le coach" />
      <Encadrant cle="adjoint" titre="5. Le coach adjoint" />

      <fieldset className="bloc-form">
        <legend>6. Les joueurs <span className="small">({joueurs.length})</span></legend>
        <p className="small" style={{ margin: "0 0 10px" }}>
          Nom et prénoms suffisent ; la photo figurera sur la licence. Vous pourrez aussi ajouter ou retirer des joueurs plus tard, depuis l&apos;espace de votre club.
        </p>
        <input type="hidden" name="joueurs" value={joueurs.join(",")} />
        <div className="joueurs-form">
          {joueurs.map((k, i) => (
            <div key={k} className="joueur-form">
              <div className="joueur-form-tete">
                <b>Joueur {i + 1}</b>
                <button type="button" className="btn line sm" onClick={() => setJoueurs((l) => l.filter((x) => x !== k))}>Retirer</button>
              </div>
              <div className="form-grid">
                <label className="field">Nom<input name={`j${k}_nom`} maxLength={60} /></label>
                <label className="field">Prénoms<input name={`j${k}_prenoms`} maxLength={80} /></label>
                <label className="field">Poste
                  <select name={`j${k}_poste`} defaultValue="">
                    <option value="">—</option>
                    {POSTES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </label>
                <label className="field">Numéro de maillot<input name={`j${k}_numero`} type="number" min={1} max={99} /></label>
                <ChampPhoto name={`j${k}_photo`} label="Photo" />
              </div>
            </div>
          ))}
        </div>
        {joueurs.length < 40 && (
          <button type="button" className="btn line sm" style={{ marginTop: 10 }} onClick={() => { setJoueurs((l) => [...l, suivant]); setSuivant((n) => n + 1); }}>
            + Ajouter un joueur
          </button>
        )}
      </fieldset>
      </details>

      <label className="field full">Message pour le comité (facultatif)<textarea name="message" rows={3} maxLength={500} /></label>
      {etat.erreur && <p className="form-err full">{etat.erreur}</p>}
      <div className="form-actions"><button className="btn primary" disabled={envoi}>{envoi ? "Envoi des informations et des photos…" : "Envoyer la demande"}</button></div>
    </form>
  );
}
