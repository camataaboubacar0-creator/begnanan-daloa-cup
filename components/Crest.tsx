import type { Club } from "@/lib/types";

/** Pastille aux couleurs du club, en attendant les logos officiels. */
export function Crest({ club, size = "mini" }: { club?: Club; size?: "mini" | "crest" }) {
  if (!club) return <div className={size} style={{ background: "var(--surface-2)" }} />;
  if (club.logo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={size} src={club.logo_url} alt="" style={{ objectFit: "contain", background: "#fff" }} />;
  }
  return (
    <div className={size} style={{ background: club.couleur }} aria-hidden="true">
      {club.sigle}
    </div>
  );
}
