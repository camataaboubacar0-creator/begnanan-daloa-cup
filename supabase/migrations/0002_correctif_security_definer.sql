-- Correctif pour une base créée avec la première version de 0001_schema.sql
-- (avertissement « Security Definer View » du Security Advisor de Supabase).
-- Inutile si 0001_schema.sql a été exécuté dans sa version actuelle.

alter view classement set (security_invoker = true);

drop view if exists places_restantes;

create or replace function places_restantes(p_match uuid)
returns table (categorie_id uuid, restantes int)
language sql stable security definer set search_path = public
as $$
  select cb.id,
    (cb.places_par_match - coalesce((
      select sum(co.quantite) from commandes co
      where co.match_id = p_match and co.categorie_id = cb.id and co.statut in ('payée', 'en attente')
    ), 0))::int
  from categories_billet cb;
$$;

grant execute on function places_restantes(uuid) to anon, authenticated;
