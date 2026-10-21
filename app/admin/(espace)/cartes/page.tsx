import { BoutonImprimer } from "@/components/admin/BoutonImprimer";
import { CarteEncadrant, CarteLicence } from "@/components/licence/CarteLicence";
import { exigerAcces } from "@/lib/auth";
import { adresseDuSite } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import type { Club, Encadrant, Joueur } from "@/lib/types";

const ORDRE = { président: 0, coach: 1, adjoint: 2 };

/** Cartes du club prêtes à imprimer : encadrement puis joueurs, au format carte bancaire. */
export default async function Cartes({ searchParams }: { searchParams: Promise<{ club?: string }> }) {
  const orga = await exigerAcces("cartes");
  const db = await createClient();
  const { data: clubs } = await db.from("clubs").select("id, nom").order("nom");
  const liste = (clubs ?? []) as Pick<Club, "id" | "nom">[];
  const demande = (await searchParams).club;
  const clubId = orga.role === "president" ? orga.club_id! : (liste.find((c) => c.id === demande) ?? liste[0])?.id;
  const club = liste.find((c) => c.id === clubId);

  const [{ data: encadrants }, { data: joueurs }] = clubId
    ? await Promise.all([
        db.from("encadrants").select("*").eq("club_id", clubId).eq("valide", true),
        db.from("joueurs").select("*").eq("club_id", clubId).eq("etat", "active").order("nom"),
      ])
    : [{ data: [] }, { data: [] }];
  const staff = ((encadrants ?? []) as Encadrant[]).sort((a, b) => ORDRE[a.fonction] - ORDRE[b.fonction]);
  const js = (joueurs ?? []) as Joueur[];
  const base = await adresseDuSite();

  return (
    <div className="card">
      <div className="no-print">
        <h3 style={{ marginBottom: 6 }}>Cartes à imprimer{club ? ` · ${club.nom}` : ""}</h3>
        <p className="small" style={{ marginBottom: 12 }}>
          Seules les cartes validées par le comité apparaissent. À l&apos;impression, elles sont au format carte bancaire (85,6 × 54 mm),
          8 par page A4 : imprimez en couleur, à 100 % (sans « ajuster à la page »), puis découpez et plastifiez.
        </p>
        <div className="form-row" style={{ marginBottom: 16 }}>
          {orga.role !== "president" && (
            <form className="form-row" method="get">
              <label className="field">Club
                <select name="club" defaultValue={clubId}>
                  {liste.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </label>
              <button className="btn line sm">Afficher</button>
            </form>
          )}
          {staff.length + js.length > 0 && <BoutonImprimer libelle={`Imprimer les ${staff.length + js.length} cartes`} />}
        </div>
      </div>
      {!club && <p className="small">Aucun club pour l&apos;instant.</p>}
      {club && staff.length + js.length === 0 && (
        <p className="small">Aucune carte validée pour ce club : les cartes apparaissent ici une fois que le comité a validé l&apos;encadrement et les licences.</p>
      )}
      <div className="cartes-print">
        {staff.length > 0 && <h3>Encadrement</h3>}
        {staff.map((e) => <CarteEncadrant key={e.id} encadrant={e} club={club!.nom} base={base} />)}
        {js.length > 0 && <h3>Joueurs</h3>}
        {js.map((j) => <CarteLicence key={j.id} joueur={j} club={club!.nom} base={base} />)}
      </div>
    </div>
  );
}
