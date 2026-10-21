"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Onglets d'un espace : le premier (accueil) n'est actif que sur sa propre adresse. */
export function OngletsAdmin({ onglets, label = "Administration" }: { onglets: string[][]; label?: string }) {
  const path = usePathname();
  return (
    <nav className="adm-tabs" aria-label={label}>
      {onglets.map(([href, label], i) => (
        <Link key={href} href={href} className={(i === 0 ? path === href : path.startsWith(href)) ? "on" : ""}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
