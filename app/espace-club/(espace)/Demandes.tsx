import { Formulaire } from "@/components/admin/Formulaire";
import { dateCourte } from "@/lib/format";
import type { ModificationClub } from "@/lib/types";
import { annulerDemande } from "./actions";

const STATUTS: Record<ModificationClub["statut"], [string, string]> = {
  "en attente": ["En attente du comité", "warn"],
  acceptée: ["Acceptée", "ok"],
  refusée: ["Refusée", "bad"],
  annulée: ["Annulée", "info"],
};

export function StatutDemande({ d }: { d: ModificationClub }) {
  const [label, ton] = STATUTS[d.statut];
  return <span className={`pill ${ton}`}>{label}</span>;
}

/** Demande en attente sur un élément : on ne peut pas en proposer une autre avant la réponse. */
export function DemandeEnAttente({ d }: { d: ModificationClub }) {
  return (
    <div className="demande-attente">
      <p className="small">
        <b>{d.action === "retirer" ? "Retrait demandé" : "Modification proposée"}</b> le {dateCourte(d.cree_le.slice(0, 10))} : en attente de la réponse du comité.
      </p>
      <Formulaire action={annulerDemande} bouton="Annuler la demande" className="form-row">
        <input type="hidden" name="id" value={d.id} />
      </Formulaire>
    </div>
  );
}
