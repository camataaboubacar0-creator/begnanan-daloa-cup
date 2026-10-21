import Link from "next/link";
import { Formulaire } from "@/components/admin/Formulaire";
import { FilMessages } from "@/components/FilMessages";
import { exigerAcces } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Club, MessageClub } from "@/lib/types";
import { repondre } from "./actions";

/** Messages des clubs : liste des fils (non lus en tête), puis le fil d'un club. */
export default async function Messages({ searchParams }: { searchParams: Promise<{ club?: string }> }) {
  await exigerAcces("messages");
  const db = await createClient();
  const choisi = (await searchParams).club;
  const [{ data: clubs }, { data: messages }] = await Promise.all([
    db.from("clubs").select("id, nom").order("nom"),
    db.from("messages_club").select("*").order("cree_le", { ascending: false }).limit(1000),
  ]);
  const liste = (clubs ?? []) as Pick<Club, "id" | "nom">[];
  const tous = (messages ?? []) as MessageClub[];

  if (choisi) {
    const club = liste.find((c) => c.id === choisi);
    if (club) await db.rpc("marquer_messages_lus", { p_club: club.id });
    return (
      <div className="card">
        <Link className="small" href="/admin/messages">← Tous les clubs</Link>
        <h3 style={{ margin: "8px 0 12px" }}>{club?.nom ?? "Club introuvable"}</h3>
        {club && (
          <>
            <FilMessages messages={tous.filter((m) => m.club_id === club.id).reverse()} cote="comite" />
            <Formulaire action={repondre} bouton="Envoyer au club" className="form-grid fil-form">
              <input type="hidden" name="club" value={club.id} />
              <label className="field full">Message<textarea name="texte" rows={3} required maxLength={1000} /></label>
            </Formulaire>
          </>
        )}
      </div>
    );
  }

  const fils = liste
    .map((c) => {
      const du = tous.filter((m) => m.club_id === c.id);
      return { ...c, dernier: du[0], nonLus: du.filter((m) => !m.de_comite && !m.lu).length };
    })
    .sort((a, b) => b.nonLus - a.nonLus || (b.dernier?.cree_le ?? "").localeCompare(a.dernier?.cree_le ?? ""));

  return (
    <div className="card">
      <h3 style={{ marginBottom: 6 }}>Messages des clubs</h3>
      <p className="small" style={{ marginBottom: 12 }}>Chaque président écrit au comité depuis son espace club. Ouvrez un fil pour lire et répondre ; vous pouvez aussi écrire le premier.</p>
      {!liste.length && <p className="small">Aucun club pour l&apos;instant.</p>}
      <div className="adm-list">
        {fils.map((c) => (
          <Link key={c.id} href={`/admin/messages?club=${c.id}`} className="adm-item fil-lien">
            <b>{c.nom}</b> {c.nonLus > 0 && <span className="pill warn">{c.nonLus} non lu{c.nonLus > 1 ? "s" : ""}</span>}
            <span className="small">{c.dernier ? ` · ${c.dernier.texte.slice(0, 80)}${c.dernier.texte.length > 80 ? "…" : ""}` : " · aucun message"}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
