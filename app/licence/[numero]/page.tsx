import type { Metadata } from "next";
import Link from "next/link";
import { createPublicClient, supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Vérification de licence", robots: { index: false } };

type Licence = { numero: string; nom: string; prenoms: string; club: string; poste: string | null; active: boolean; photo_url: string | null; logo_url: string | null };

/** Page ouverte en scannant le QR code d'une carte de licence. */
export default async function VerifierLicence({ params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;
  let licence: Licence | null = null;
  if (supabaseConfigured) {
    const { data } = await createPublicClient().rpc("verifier_carte", { p_numero: decodeURIComponent(numero) });
    licence = (data as Licence[] | null)?.[0] ?? null;
  }
  // Cartes de l'encadrement (président, coach, adjoint) : numéros en BDC-AA-E…
  const encadrement = /^BDC-\d{2}-E/i.test(decodeURIComponent(numero));
  return (
    <section className="band">
      <div className="wrap">
        <div className="card verif">
          <img className="verif-logo" src="/logo-small.webp" alt="" />
          <div className="eyebrow">Bêgnanan Daloa Cup · vérification de {encadrement ? "carte" : "licence"}</div>
          {licence ? (
            <>
              <div className={`etat ${licence.active ? "ok" : "bad"}`}>
                {encadrement ? (licence.active ? "Carte valide" : "Carte non valide") : licence.active ? "Licence active" : "Licence non active"}
              </div>
              {/* La photo permet de contrôler l'identité au stade. */}
              {licence.photo_url && <img className="verif-photo" src={licence.photo_url} alt={`${licence.prenoms} ${licence.nom}`} />}
              <h2 style={{ fontSize: "1.6rem" }}>{licence.prenoms} {licence.nom}</h2>
              <p className="lic-club">{licence.logo_url && <img src={licence.logo_url} alt="" />}{licence.club}{licence.poste ? ` · ${licence.poste}` : ""}</p>
              <p className="small mono">{licence.numero} · saison {new Date().getFullYear()}</p>
              {!licence.active && (
                <p className="small">
                  {encadrement ? "Cette personne n'est pas autorisée sur le banc tant que le comité n'a pas validé sa carte." : "Ce joueur ne peut pas être aligné tant que le comité n'a pas réactivé sa licence."}
                </p>
              )}
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
