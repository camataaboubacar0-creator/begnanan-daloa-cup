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

-- a_le_role sort du schéma exposé par l'API (les règles de sécurité suivent automatiquement).
create schema if not exists prive;
grant usage on schema prive to anon, authenticated;
do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'a_le_role') then
    alter function public.a_le_role(role_organisateur[]) set schema prive;
  end if;
end $$;

create or replace function valider_entree(ref text)
returns table (resultat text, categorie text, quantite int, entrees int, acheteur text)
language plpgsql security definer set search_path = public
as $$
declare c commandes;
begin
  if not prive.a_le_role('{billetterie}') then
    raise exception 'accès refusé';
  end if;
  select * into c from commandes where reference = upper(trim(ref)) for update;
  if not found or c.statut <> 'payée' then
    return query select 'inconnu'::text, null::text, null::int, null::int, null::text;
    return;
  end if;
  if c.entrees_validees >= c.quantite then
    return query select 'déjà utilisé', (select nom from categories_billet where id = c.categorie_id), c.quantite, c.entrees_validees, c.nom_acheteur;
    return;
  end if;
  update commandes set entrees_validees = entrees_validees + 1 where id = c.id;
  return query select 'valide', (select nom from categories_billet where id = c.categorie_id), c.quantite, c.entrees_validees + 1, c.nom_acheteur;
end;
$$;

revoke execute on function valider_entree(text) from public, anon;
grant execute on function valider_entree(text) to authenticated;
