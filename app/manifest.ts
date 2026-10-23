import type { MetadataRoute } from "next";

// Permet d'« installer » le site sur l'écran d'accueil du téléphone, comme une application.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BÊGNANAN DALOA CUP",
    short_name: "Bêgnanan Cup",
    description: "Matchs, résultats, classements et billets du tournoi de maracana de Daloa.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f5ee",
    theme_color: "#0e6a26",
    lang: "fr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
