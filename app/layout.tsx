import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Apparitions } from "@/components/Apparitions";
import { Header, TabBar } from "@/components/Navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "BÊGNANAN DALOA CUP", template: "%s · BÊGNANAN DALOA CUP" },
  description: "Tournoi de maracana à Daloa : billetterie, matchs, résultats, classements et médias.",
  icons: { icon: "/logo-small.webp" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0e6a26" };

// Applique le thème choisi avant l'affichage pour éviter un flash.
const THEME = `try{var t=localStorage.getItem("bdc-theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;800;900&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: THEME }} />
      </head>
      <body data-space="public">
        <Header />
        <main>{children}</main>
        <footer>
          <div className="wrap">
            <div>
              <b style={{ fontFamily: "var(--f-display)", fontSize: "1.3rem", letterSpacing: ".03em" }}>BÊGNANAN DALOA CUP</b>
              <br />
              Comité d&apos;organisation · Espace CP1–Orly, Daloa
            </div>
            <div>Tournoi de maracana · Daloa, Côte d&apos;Ivoire</div>
          </div>
        </footer>
        <TabBar />
        <Apparitions />
        <SpeedInsights />
      </body>
    </html>
  );
}
