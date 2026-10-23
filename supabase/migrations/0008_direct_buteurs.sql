-- Match en direct : le comité saisit buts et cartons depuis son téléphone pendant le match.
-- Le score du match se recalcule à partir des buts ; les pages publiques montrent le déroulé
-- et le classement des buteurs. À exécuter après 0007 ; peut être rejoué sans risque.

create table if not exists evenements_match (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matchs(id) on delete cascade,
  -- Équipe à qui l'événement est compté : celle qui marque (but et but contre son camp),
  -- celle du joueur sanctionné (cartons).
  club_id uuid not null references clubs(id),
  type text not null check (type in ('but', 'csc', 'jaune', 'rouge')),
  joueur_id uuid references joueurs(id) on delete set null,
  -- Nom affiché (copié au moment de la saisie : les fiches des joueurs ne sont pas publiques).
  joueur_nom text check (char_length(joueur_nom) <= 150),
  minute int check (minute between 0 and 130),
  cree_le timestamptz not null default now()
);
create index if not exists evenements_match_match_id_idx on evenements_match (match_id);
create index if not exists evenements_match_club_id_idx on evenements_match (club_id);
create index if not exists evenements_match_joueur_id_idx on evenements_match (joueur_id);

alter table evenements_match enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'evenements_match' and policyname = 'événements publics') then
    create policy "événements publics" on evenements_match for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'evenements_match' and policyname = 'événements ajoutés par comité') then
    create policy "événements ajoutés par comité" on evenements_match for insert with check (prive.a_le_role('{comite}'));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'evenements_match' and policyname = 'événements retirés par comité') then
    create policy "événements retirés par comité" on evenements_match for delete using (prive.a_le_role('{comite}'));
  end if;
end $$;

-- Contrôles et score : l'équipe doit jouer ce match, le résultat ne doit pas être déjà validé.
-- Le premier événement fait passer un match programmé « en cours ».
create or replace function prive.evenement_match()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  m matchs;
  id_match uuid := coalesce(new.match_id, old.match_id);
begin
  select * into m from matchs where id = id_match for update;
  if m.resultat_valide then
    raise exception 'Le résultat de ce match est déjà validé : retirez la validation pour le modifier.';
  end if;
  if tg_op = 'INSERT' then
    if new.club_id not in (m.club_domicile, m.club_exterieur) then
      raise exception 'Cette équipe ne joue pas ce match.';
    end if;
    if new.joueur_id is not null and not exists (select 1 from joueurs where id = new.joueur_id and club_id = case when new.type = 'csc' then (case when new.club_id = m.club_domicile then m.club_exterieur else m.club_domicile end) else new.club_id end) then
      raise exception 'Ce joueur n''appartient pas à l''équipe indiquée.';
    end if;
  end if;
  update matchs set
    buts_domicile = (select count(*) from evenements_match where match_id = id_match and club_id = m.club_domicile and type in ('but', 'csc')),
    buts_exterieur = (select count(*) from evenements_match where match_id = id_match and club_id = m.club_exterieur and type in ('but', 'csc')),
    statut = case when m.statut = 'programmé' then 'en cours' else m.statut end,
    modifie_le = now()
  where id = id_match;
  return coalesce(new, old);
end;
$$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'evenement_match_score') then
    create trigger evenement_match_score after insert or delete on evenements_match
      for each row execute function prive.evenement_match();
  end if;
end $$;

-- Classement des buteurs (buts contre son camp exclus) et cartons, matchs annulés exclus.
create or replace view buteurs with (security_invoker = true) as
select e.joueur_nom, e.club_id,
  count(*) filter (where e.type = 'but') as buts,
  count(*) filter (where e.type = 'jaune') as jaunes,
  count(*) filter (where e.type = 'rouge') as rouges
from evenements_match e
join matchs m on m.id = e.match_id and m.statut <> 'annulé'
where e.joueur_nom is not null and e.type <> 'csc'
group by coalesce(e.joueur_id::text, e.joueur_nom), e.joueur_nom, e.club_id;
grant select on buteurs to anon, authenticated;
