import { Formulaire } from "@/components/admin/Formulaire";
import { exigerAcces } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { ROLES, ROLES_ORGANISATEURS, type Role } from "@/lib/types";
import { creerCompte, modifierCompte } from "./actions";

function ChoixRole({ valeur }: { valeur?: Role }) {
  return (
    <label className="field">Rôle
      <select name="role" defaultValue={valeur ?? "comite"}>
        {ROLES_ORGANISATEURS.map((k) => <option key={k} value={k}>{ROLES[k].label}</option>)}
      </select>
    </label>
  );
}

export default async function AdminComptes() {
  await exigerAcces("comptes");
  let profils: { user_id: string; nom: string; role: Role; actif: boolean }[] = [];
  let emails = new Map<string, string>();
  try {
    const admin = createServiceClient();
    const [p, u] = await Promise.all([admin.from("profils").select("*").order("nom"), admin.auth.admin.listUsers({ perPage: 200 })]);
    profils = p.data ?? [];
    emails = new Map((u.data?.users ?? []).map((x) => [x.id, x.email ?? ""]));
  } catch {
    return <div className="card"><p>La clé de service Supabase n&apos;est pas configurée : voir le guide d&apos;installation.</p></div>;
  }

  return (
    <>
      <div className="card">
        <h3 style={{ marginBottom: 6 }}>Rôles</h3>
        <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
          <li><b>Administrateur</b> : tout, y compris les comptes.</li>
          <li><b>Comité</b> : paramètres du tournoi, clubs, matchs, scores et validation, inscriptions et licences.</li>
          <li><b>Billetterie</b> : prix, catégories, commandes, contrôle à l&apos;entrée.</li>
          <li><b>Médias</b> : débriefs, annonces, hommes du match, galerie.</li>
          <li><b>Présidents de club</b> : leur compte est créé quand le comité accepte la demande d&apos;inscription du club (onglet « Inscriptions et licences »).</li>
        </ul>
      </div>
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Créer un compte</h3>
        <Formulaire action={creerCompte} bouton="Créer le compte">
          <label className="field">Nom<input name="nom" required /></label>
          <label className="field">E-mail<input name="email" type="email" required autoComplete="off" /></label>
          <ChoixRole />
          <label className="field">Mot de passe provisoire<input name="motdepasse" type="text" minLength={10} required autoComplete="off" /></label>
        </Formulaire>
      </div>
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Organisateurs ({profils.length})</h3>
        <div className="adm-list">
          {profils.map((p) => (
            <div key={p.user_id} className="adm-item">
              <b>{p.nom}</b> <span className="small">{emails.get(p.user_id)}</span>
              <Formulaire action={modifierCompte} className="form-row">
                <input type="hidden" name="id" value={p.user_id} />
                <ChoixRole valeur={p.role} />
                <label className="chk"><input name="actif" type="checkbox" defaultChecked={p.actif} /> Actif</label>
              </Formulaire>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
