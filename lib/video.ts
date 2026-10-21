/** Transforme un lien YouTube ou Facebook en adresse intégrable. Retourne null si le site n'est pas reconnu. */
export function lienIntegrable(url: string): string | null {
  try {
    const u = new URL(url);
    const hote = u.hostname.replace(/^www\.|^m\./, "");
    if (hote === "youtu.be") return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
    if (hote === "youtube.com") {
      const id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]+)/)?.[1];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (hote === "facebook.com" || hote === "fb.watch") {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}`;
    }
    return null;
  } catch {
    return null;
  }
}
