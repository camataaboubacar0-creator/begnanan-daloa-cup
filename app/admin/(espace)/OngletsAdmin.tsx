"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function OngletsAdmin({ onglets }: { onglets: string[][] }) {
  const path = usePathname();
  return (
    <nav className="adm-tabs" aria-label="Administration">
      {onglets.map(([href, label]) => (
        <Link key={href} href={href} className={(href === "/admin" ? path === href : path.startsWith(href)) ? "on" : ""}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
