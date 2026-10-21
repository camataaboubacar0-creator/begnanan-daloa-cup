import type { Metadata } from "next";
import Link from "next/link";
import { createPublicClient, supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Vérification de licence", robots: { index: false } };

type Licence = { numero: string; nom: string; prenoms: string; club: string; poste: string | null; active: boolean };

/** Page ouverte en scannant le QR code d'une carte de licence. */
export default async function VerifierLicence({ params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;
  let licence: Licence | null = null;
  if (supabaseConfigured) {
    const { data } = await createPublicClient().rpc("verifier_licence", { p_numero: decodeURIComponent(numero) });
    licence = (data as Licence[] | null)?.[0] ?? null;
  }
  return (
    <section className="band">
      <div className="wrap">
        <div className="card verif">
          <div className="eyebrow">Vérification de licence</div>
          {licence ? (
            <>
              <div className={`etat ${licence.active ? "ok" : "bad"}`}>{licence.active ? "Licence active" : "Licence non active"}</div>
              <h2 style={{ fontSize: "1.6rem" }}>{licence.prenoms} {licence.nom}</h2>
              <p>{licence.club}{licence.poste ? ` · ${licence.poste}` : ""}</p>
              <p className="small mono">{licence.numero}</p>
              {!licence.active && <p className="small">Ce joueur ne peut pas être aligné tant que le comité n&apos;a pas réactivé sa licence.</p>}
            </>
          ) : (
            <>
              <div className="etat bad">Licence inconnue</div>
              <p>Aucune licence ne correspond au numéro {decodeURIComponent(numero)}.</p>
            </>
          )}
          <Link className="btn line sm" href="/" style={{ marginTop: 12 }}>Retour au site</Link>
        </div>
      </div>
    </section>
  );
}
