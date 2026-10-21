import "server-only";
import { numeroInternational } from "./format";
import type { Alerte } from "./types";

// Envoi automatique par l'API WhatsApp Cloud de Meta. Il faut un compte WhatsApp Business,
// un numéro dédié et un modèle de message approuvé par Meta, avec deux variables :
// {{1}} = titre de l'annonce, {{2}} = texte. Sans ces réglages, le comité diffuse à la main
// (bouton « Partager sur WhatsApp »).
const TOKEN = process.env.WHATSAPP_TOKEN;
const TELEPHONE_ID = process.env.WHATSAPP_PHONE_ID;
const MODELE = process.env.WHATSAPP_TEMPLATE;
const LANGUE = process.env.WHATSAPP_TEMPLATE_LANG ?? "fr";

export const envoiAutomatique = Boolean(TOKEN && TELEPHONE_ID && MODELE);

/** Message prêt à partager (diffusion manuelle). */
export const texteAlerte = (a: Pick<Alerte, "titre" | "texte">, site: string) =>
  `📢 BÊGNANAN DALOA CUP\n*${a.titre}*\n${a.texte}${a.texte ? "\n" : ""}${site}`;

async function envoyerA(numero: string, a: Pick<Alerte, "titre" | "texte">) {
  const r = await fetch(`https://graph.facebook.com/v21.0/${TELEPHONE_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: numeroInternational(numero),
      type: "template",
      template: {
        name: MODELE,
        language: { code: LANGUE },
        components: [{ type: "body", parameters: [{ type: "text", text: a.titre }, { type: "text", text: a.texte || " " }] }],
      },
    }),
  });
  return r.ok;
}

/** Envoie l'annonce à chaque abonné, 10 à la fois ; renvoie le nombre de messages acceptés par WhatsApp. */
export async function diffuser(a: Pick<Alerte, "titre" | "texte">, numeros: string[]) {
  if (!envoiAutomatique) return 0;
  let ok = 0;
  for (let i = 0; i < numeros.length; i += 10) {
    const r = await Promise.all(numeros.slice(i, i + 10).map((n) => envoyerA(n, a).catch(() => false)));
    ok += r.filter(Boolean).length;
  }
  return ok;
}
