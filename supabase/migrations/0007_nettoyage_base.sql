-- Nettoyage signalé par les alertes Supabase (audit du site). Aucune donnée modifiée ; peut être rejoué.

-- Ancienne règle de lecture des abonnés, remplacée en 0004 par « abonnés lus par médias et comité »
-- mais restée en production : elle ne donne plus aucun accès (sa suppression se fait depuis Supabase).
do $$ begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'abonnes_alertes' and policyname = 'abonnés lus par médias') then
    execute 'alter policy "abonnés lus par médias" on abonnes_alertes using (false)';
  end if;
end $$;

-- auth.uid() calculé une fois par requête au lieu d'une fois par ligne.
alter policy "profil lu par soi" on profils using (user_id = (select auth.uid()) or prive.a_le_role('{admin}'));
alter policy "président lu par soi ou le comité" on presidents using (user_id = (select auth.uid()) or prive.a_le_role('{comite}'));

-- Index des clés étrangères : listes par club, matchs d'un club, transferts, etc.
create index if not exists abonnes_alertes_club_id_idx on abonnes_alertes (club_id);
create index if not exists alertes_match_id_idx on alertes (match_id);
create index if not exists commandes_categorie_id_idx on commandes (categorie_id);
create index if not exists demandes_club_club_id_idx on demandes_club (club_id);
create index if not exists demandes_club_user_id_idx on demandes_club (user_id);
create index if not exists matchs_club_domicile_idx on matchs (club_domicile);
create index if not exists matchs_club_exterieur_idx on matchs (club_exterieur);
create index if not exists modifications_club_club_id_idx on modifications_club (club_id);
create index if not exists presidents_club_id_idx on presidents (club_id);
create index if not exists publications_club_id_idx on publications (club_id);
create index if not exists publications_match_id_idx on publications (match_id);
create index if not exists transferts_club_arrivee_idx on transferts (club_arrivee);
create index if not exists transferts_club_depart_idx on transferts (club_depart);
