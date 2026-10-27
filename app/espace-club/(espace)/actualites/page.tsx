import Link from "next/link";
import { Formulaire } from "@/components/admin/Formulaire";
import { ChampPhoto } from "@/components/ChampPhoto";
import { dateActu, lienActu } from "@/components/CarteActualite";
import { exigerClub } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActualiteClub, CommentaireClub } from "@/lib/types";
import { masquerActualite, masquerCommentaire, publierActualite, supprimerActualite, supprimerCommentaire } from "./actions";

export default async function Actualites() {
  const orga = await exigerClub();
  const db = await createClient();
  const { data } = await db.from("actualites_club").select("*").eq("club_id", orga.club_id).order("cree_le", { ascending: false }).limit(100);
  const actualites = (data ?? []) as ActualiteClub[];
  const { data: coms } = actualites.length
    ? await db.from("commentaires_club").select("id, actualite_id, auteur, texte, masque, cree_le").in("actualite_id", actualites.map((a) => a.id)).order("cree_le")
    : { data: [] };
  const commentaires = (coms ?? []) as CommentaireClub[];

  return (
    <>
      <div className="card">
        <h3 style={{ marginBottom: 6 }}>Publier une actualité</h3>
        <p className="small" style={{ marginBottom: 12 }}>
          Photos d&apos;entraînement, joueurs à suivre, annonces du club… La publication apparaît tout de suite sur la{" "}
          <Link href={`/equipes/${orga.club_id}`}>page publique du club</Link> et sur la page d&apos;accueil du site. Le public peut aimer et commenter.
        </p>
        <Formulaire action={publierActualite} bouton="Publier">
          <label className="field full">Texte<textarea name="texte" rows={4} required maxLength={2000} placeholder="Séance d'entraînement de ce soir…" /></label>
          <ChampPhoto name="image" label="Photo (facultative)" cote={1200} />
        </Formulaire>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 6 }}>Publications du club ({actualites.length})</h3>
        {!actualites.length && <p className="small">Rien de publié pour l&apos;instant.</p>}
        <div className="adm-list">
          {actualites.map((a) => {
            const siens = commentaires.filter((c) => c.actualite_id === a.id);
            return (
              <details key={a.id} className="adm-item">
                <summary>
                  <b>{dateActu(a.cree_le)}</b> · {a.texte.length > 70 ? `${a.texte.slice(0, 70)}…` : a.texte}
                  <span className="small"> · ♥ {a.nb_jaime} · 💬 {siens.length}{a.masquee ? " · masquée" : ""}</span>
                </summary>
                {a.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="pub-image" style={{ marginTop: 10, maxHeight: 260 }} src={a.image_url} alt="" />
                )}
                <p style={{ whiteSpace: "pre-line", margin: "10px 0" }}>{a.texte}</p>
                <div className="form-row">
                  {!a.masquee && <Link className="btn line sm" href={lienActu(a)}>Voir sur le site</Link>}
                  <Formulaire action={masquerActualite} bouton={a.masquee ? "Rendre visible" : "Masquer"} className="form-row">
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="masquee" value={String(!a.masquee)} />
                  </Formulaire>
                  <Formulaire action={supprimerActualite} bouton="Supprimer" className="form-row" confirmer="Supprimer cette publication et ses commentaires ?">
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="image_url" value={a.image_url ?? ""} />
                  </Formulaire>
                </div>
                {siens.length > 0 && (
                  <div className="commentaires" style={{ marginTop: 12 }}>
                    {siens.map((c) => (
                      <div key={c.id} className={`commentaire${c.masque ? " masque" : ""}`}>
                        <b>{c.auteur}</b> <span className="small">{dateActu(c.cree_le)}{c.masque ? " · masqué" : ""}</span>
                        <p>{c.texte}</p>
                        <div className="form-row">
                          <Formulaire action={masquerCommentaire} bouton={c.masque ? "Rendre visible" : "Masquer"} className="form-row">
                            <input type="hidden" name="id" value={c.id} />
                            <input type="hidden" name="masque" value={String(!c.masque)} />
                          </Formulaire>
                          <Formulaire action={supprimerCommentaire} bouton="Supprimer" className="form-row" confirmer="Supprimer ce commentaire ?">
                            <input type="hidden" name="id" value={c.id} />
                          </Formulaire>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </details>
            );
          })}
        </div>
      </div>
    </>
  );
}
