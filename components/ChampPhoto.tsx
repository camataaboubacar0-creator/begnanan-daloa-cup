"use client";

import { useState } from "react";

// 480 px suffisent pour la carte (photo d'environ 2 cm) et gardent chaque photo autour de 40 Ko.
const COTE_MAX = 480;

/** Réduit une photo de téléphone (souvent 3 à 5 Mo) à quelques dizaines de Ko avant l'envoi. */
async function reduire(fichier: File, cote = COTE_MAX): Promise<File> {
  const image = await createImageBitmap(fichier).catch(() => null);
  if (!image) return fichier;
  const echelle = Math.min(1, cote / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * echelle);
  canvas.height = Math.round(image.height * echelle);
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.8));
  return blob ? new File([blob], fichier.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : fichier;
}

/** Champ photo avec aperçu : la photo est réduite sur le téléphone avant d'être envoyée. */
export function ChampPhoto({ name, label, actuelle, requis, cote }: { name: string; label: string; actuelle?: string | null; requis?: boolean; cote?: number }) {
  const [apercu, setApercu] = useState<string | null>(actuelle ?? null);
  const [traitement, setTraitement] = useState(false);
  return (
    <label className="field champ-photo">
      {label}
      <span className="champ-photo-ligne">
        {apercu ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={apercu} alt="" />
        ) : (
          <i aria-hidden="true">📷</i>
        )}
        <input
          type="file"
          name={name}
          accept="image/*"
          required={requis && !actuelle}
          onChange={async (e) => {
            const input = e.currentTarget;
            const f = input.files?.[0];
            if (!f) return setApercu(actuelle ?? null);
            setTraitement(true);
            const petit = await reduire(f, cote);
            try {
              const dt = new DataTransfer();
              dt.items.add(petit);
              input.files = dt.files;
            } catch {
              // Navigateur trop ancien : le fichier d'origine part tel quel.
            }
            setApercu(URL.createObjectURL(petit));
            setTraitement(false);
          }}
        />
      </span>
      {traitement && <span className="small">Préparation de la photo…</span>}
    </label>
  );
}
