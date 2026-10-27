import { Formulaire } from "@/components/admin/Formulaire";
import { ChampPhoto } from "@/components/ChampPhoto";
import { exigerAcces } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Partenaire } from "@/lib/types";
import { ajouterPartenaire, modifierPartenaire, supprimerPartenaire } from "./actions";

const NIVEAUX: [Partenaire["niveau"], string][] = [
  ["principal", "Partenaire principal (logo en grand)"],
  ["officiel", "Partenaire officiel"],
  ["soutien", "Soutien (petit logo)"],
];

function Champs({ p }: { p?: Partenaire }) {
  return (
    <>
      <label className="field">Nom<input name="nom" required maxLength={80} defaultValue={p?.nom} /></label>
      <label className="field">
        Niveau
        <select name="niveau" defaultValue={p?.niveau ?? "officiel"}>
          {NIVEAUX.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <ChampPhoto name="logo" label={p ? "Remplacer le logo" : "Logo (PNG à fond transparent de préférence)"} actuelle={p?.logo_url} requis={!p} cote={600} transparence />
      <label className="field">Site ou page du partenaire (facultatif)<input name="lien_url" type="url" placeholder="https://" defaultValue={p?.lien_url ?? ""} /></label>
      <label className="field">Ordre d&apos;affichage<input name="ordre" type="number" defaultValue={p?.ordre ?? 0} /></label>
      <label className="chk"><input type="checkbox" name="visible" defaultChecked={p?.visible ?? true} /> Visible sur le site</label>
    </>
  );
}

export default async function Partenaires() {
  await exigerAcces("partenaires");
  const { data } = await (await createClient()).from("partenaires").select("*").order("ordre").order("nom");
  const liste = (data ?? []) as Partenaire[];
  return (
    <>
      <div className="card">
        <h3 style={{ marginBottom: 6 }}>Ajouter un partenaire</h3>
        <p className="small" style={{ marginBottom: 12 }}>Les logos s&apos;affichent sur la page d&apos;accueil et en bas de chaque page du site.</p>
        <Formulaire action={ajouterPartenaire} bouton="Ajouter le partenaire">
          <Champs />
        </Formulaire>
      </div>
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Partenaires ({liste.length})</h3>
        {!liste.length && <p className="small">Aucun partenaire pour l&apos;instant.</p>}
        <div className="adm-list">
          {liste.map((p) => (
            <details key={p.id} className="adm-item">
              <summary className="partenaire-ligne">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.logo_url} alt="" />
                <b>{p.nom}</b>
                <span className="small">{NIVEAUX.find(([v]) => v === p.niveau)?.[1]}{p.visible ? "" : " · masqué"}</span>
              </summary>
              <Formulaire action={modifierPartenaire}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="logo_actuel" value={p.logo_url} />
                <Champs p={p} />
              </Formulaire>
              <Formulaire action={supprimerPartenaire} className="form-del" bouton="Retirer" confirmer={`Retirer ${p.nom} ?`}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="logo_actuel" value={p.logo_url} />
              </Formulaire>
            </details>
          ))}
        </div>
      </div>
    </>
  );
}
