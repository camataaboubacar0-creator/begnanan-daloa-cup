import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rafraîchit la session Supabase et protège l'espace pro (/admin) et l'espace club.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return response;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const espace = path.startsWith("/espace-club") ? "/espace-club" : "/admin";
  if (path !== `${espace}/connexion` && !data.user) {
    const login = request.nextUrl.clone();
    login.pathname = `${espace}/connexion`;
    login.searchParams.set("suite", path);
    return NextResponse.redirect(login);
  }
  return response;
}

// Seuls les deux espaces utilisent les comptes : les pages publiques n'attendent pas Supabase.
export const config = {
  matcher: ["/admin/:path*", "/espace-club/:path*"],
};
