import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Formulaire } from "@/components/admin/Formulaire";
import { dateActu } from "@/components/CarteActualite";
import { Crest } from "@/components/Crest";
import { getActualiteClub, getClubs, getCommentairesClub } from "@/lib/data";
import { lienWhatsApp } from "@/lib/format";
import { commenter } from "../../../actions";
import { BoutonJaime } from "../../../BoutonJaime";

export const revalidate = 30;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function charger(id: string, actuId: string) {
  if (!UUID.test(actuId)) return null;
  const [actu, clubs] = await Promise.all([getActualiteClub(actuId), getClubs()]);
  const club = clubs.find((c) => c.id === id);
  return actu && club && actu.club_id === club.id ? { actu, club } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string; actu: string }> }): Promise<Metadata> {
  const { id, actu } = await params;
  const r = await charger(id, actu);
  if (!r) return {};
  const description = r.actu.texte.slice(0, 160);
  return {
    title: `${r.club.nom} : actualité`,
    description,
    openGraph: { title: r.club.nom, description, ...(r.actu.image_url ? { images: [r.actu.image_url] } : {}) },
  };
}

export default async function ActualiteClub({ params }: { params: Promise<{ id: string; actu: string }> }) {
  const { id, actu: actuId } = await params;
  const r = await charger(id, actuId);
  if (!r) notFound();
  const { actu, club } = r;
  const commentaires = await getCommentairesClub(actu.id);

  return (
    <section className="band">
      <div className="wrap" style={{ maxWidth: 820 }}>
        <Link href={`/equipes/${club.id}`} className="small">← Page de {club.nom}</Link>
        <div className="actu-club-tete" style={{ margin: "16px 0 12px" }}>
          <Crest club={club} size="crest" />
          <div>
            <Link href={`/equipes/${club.id}`}><b>{club.nom}</b></Link>
            <div className="small">{dateActu(actu.cree_le, "long")}</div>
          </div>
        </div>
        {actu.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="pub-image" src={actu.image_url} alt={`Photo publiée par ${club.nom}`} />
        )}
        <p style={{ whiteSpace: "pre-line", margin: "14px 0 18px" }}>{actu.texte}</p>
        <div className="form-row">
          <BoutonJaime id={actu.id} nb={actu.nb_jaime} />
          <a className="btn line sm" href={lienWhatsApp(`${club.nom} · ${actu.texte.slice(0, 80)} · BÊGNANAN DALOA CUP`)} target="_blank" rel="noopener">
            Partager sur WhatsApp
          </a>
        </div>

        <h3 className="club-titre">Commentaires ({commentaires.length})</h3>
        {commentaires.length ? (
          <div className="commentaires">
            {commentaires.map((c) => (
              <div key={c.id} className="commentaire">
                <b>{c.auteur}</b> <span className="small">{dateActu(c.cree_le)}</span>
                <p>{c.texte}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="small">Soyez le premier à commenter.</p>
        )}
        <div className="card" style={{ marginTop: 16 }}>
          <Formulaire action={commenter} bouton="Publier le commentaire">
            <input type="hidden" name="actualite_id" value={actu.id} />
            <label className="pot-de-miel" aria-hidden="true">Site<input name="site" tabIndex={-1} autoComplete="off" /></label>
            <label className="field">Votre nom<input name="auteur" required maxLength={60} autoComplete="nickname" /></label>
            <label className="field full">Votre commentaire<textarea name="texte" rows={3} required maxLength={500} /></label>
            <p className="small full">Restez respectueux : le club et le comité peuvent masquer un commentaire. Les liens ne sont pas acceptés.</p>
          </Formulaire>
        </div>
      </div>
    </section>
  );
}
