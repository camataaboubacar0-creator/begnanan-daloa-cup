import { getPartenaires } from "@/lib/data";
import type { Partenaire } from "@/lib/types";

/** Logo et nom, cliquables s'il y a un lien vers le site du partenaire. */
function Logo({ p }: { p: Partenaire }) {
  const img = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.logo_url} alt="" loading="lazy" />
      <span className="partenaire-nom">{p.nom}</span>
    </>
  );
  return p.lien_url ? (
    <a className={`partenaire ${p.niveau}`} href={p.lien_url} target="_blank" rel="noopener sponsored">{img}</a>
  ) : (
    <span className={`partenaire ${p.niveau}`}>{img}</span>
  );
}

/** Les partenaires ne doivent jamais empêcher une page de s'afficher. */
const charger = () => getPartenaires().catch(() => [] as Partenaire[]);

/** Section « Nos partenaires » de la page d'accueil, classée par niveau. */
export async function SectionPartenaires() {
  const liste = await charger();
  if (!liste.length) return null;
  const principaux = liste.filter((p) => p.niveau === "principal");
  const autres = liste.filter((p) => p.niveau !== "principal");
  return (
    <section className="band partenaires-band">
      <div className="wrap">
        <div className="head">
          <div>
            <div className="eyebrow">Ils soutiennent le tournoi</div>
            <h2>Nos partenaires</h2>
          </div>
        </div>
        {principaux.length > 0 && <div className="partenaires principaux">{principaux.map((p) => <Logo key={p.id} p={p} />)}</div>}
        {autres.length > 0 && <div className="partenaires">{autres.map((p) => <Logo key={p.id} p={p} />)}</div>}
      </div>
    </section>
  );
}

/** Bandeau de logos en bas de chaque page. */
export async function PiedPartenaires() {
  const liste = await charger();
  if (!liste.length) return null;
  return (
    <div className="wrap pied-partenaires">
      <span className="small">Partenaires</span>
      <div className="partenaires">{liste.map((p) => <Logo key={p.id} p={p} />)}</div>
    </div>
  );
}
