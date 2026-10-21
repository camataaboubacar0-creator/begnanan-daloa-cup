import { Formulaire } from "@/components/admin/Formulaire";
import { FilMessages } from "@/components/FilMessages";
import { exigerClub } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { MessageClub } from "@/lib/types";
import { envoyerMessage } from "../actions";

export default async function Messages() {
  const orga = await exigerClub();
  const db = await createClient();
  const { data } = await db.from("messages_club").select("*").eq("club_id", orga.club_id).order("cree_le").limit(200);
  // Ouvrir le fil vaut lecture des messages du comité.
  await db.rpc("marquer_messages_lus", { p_club: orga.club_id });
  return (
    <div className="card">
      <h3 style={{ marginBottom: 6 }}>Messages avec le comité</h3>
      <p className="small" style={{ marginBottom: 12 }}>Questions, informations, justificatifs : le comité d&apos;organisation lit et répond ici.</p>
      <FilMessages messages={(data ?? []) as MessageClub[]} cote="club" />
      <Formulaire action={envoyerMessage} bouton="Envoyer" className="form-grid fil-form">
        <label className="field full">Votre message<textarea name="texte" rows={3} required maxLength={1000} /></label>
      </Formulaire>
    </div>
  );
}
