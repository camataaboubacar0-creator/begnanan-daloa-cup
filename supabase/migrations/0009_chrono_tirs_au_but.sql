-- Chrono du match en direct (mi-temps, prolongations) et séance de tirs au but.
-- Le chrono se calcule à partir de l'heure où il a été lancé : rien n'est écrit chaque seconde.
-- À exécuter après 0008 ; peut être rejoué sans risque.

-- Temps de jeu fixé par le comité (vide tant qu'il n'est pas décidé).
alter table tournoi add column if not exists duree_mi_temps int check (duree_mi_temps between 1 and 60);
alter table tournoi add column if not exists duree_prolongation int check (duree_prolongation between 1 and 30);
alter table tournoi add column if not exists tab_tireurs int not null default 3 check (tab_tireurs between 1 and 11);

-- Période en cours : 1re et 2e mi-temps, 1re et 2e prolongation, tirs au but.
alter table matchs add column if not exists periode text check (periode in ('mt1', 'mt2', 'prol1', 'prol2', 'tab'));
alter table matchs add column if not exists periode_terminee boolean not null default false;
-- Chrono : secondes déjà jouées dans la période, plus le temps écoulé depuis chrono_lance s'il tourne.
alter table matchs add column if not exists chrono_lance timestamptz;
alter table matchs add column if not exists chrono_ecoule int not null default 0 check (chrono_ecoule >= 0);
alter table matchs add column if not exists tab_domicile int check (tab_domicile >= 0);
alter table matchs add column if not exists tab_exterieur int check (tab_exterieur >= 0);

create table if not exists tirs_au_but (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matchs(id) on delete cascade,
  club_id uuid not null references clubs(id),
  ordre int not null,
  joueur_id uuid references joueurs(id) on delete set null,
  joueur_nom text check (char_length(joueur_nom) <= 150),
  reussi boolean not null,
  cree_le timestamptz not null default now(),
  unique (match_id, ordre)
);
create index if not exists tirs_au_but_club_id_idx on tirs_au_but (club_id);
create index if not exists tirs_au_but_joueur_id_idx on tirs_au_but (joueur_id);

alter table tirs_au_but enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'tirs_au_but' and policyname = 'tirs au but publics') then
    create policy "tirs au but publics" on tirs_au_but for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'tirs_au_but' and policyname = 'tirs au but ajoutés par comité') then
    create policy "tirs au but ajoutés par comité" on tirs_au_but for insert with check (prive.a_le_role('{comite}'));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'tirs_au_but' and policyname = 'tirs au but retirés par comité') then
    create policy "tirs au but retirés par comité" on tirs_au_but for delete using (prive.a_le_role('{comite}'));
  end if;
end $$;

-- Contrôles et score de la séance, comme pour les buts du match.
create or replace function prive.tir_au_but()
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
    if new.joueur_id is not null and not exists (select 1 from joueurs where id = new.joueur_id and club_id = new.club_id) then
      raise exception 'Ce joueur n''appartient pas à l''équipe indiquée.';
    end if;
  end if;
  update matchs set
    tab_domicile = (select count(*) filter (where reussi) from tirs_au_but where match_id = id_match and club_id = m.club_domicile),
    tab_exterieur = (select count(*) filter (where reussi) from tirs_au_but where match_id = id_match and club_id = m.club_exterieur),
    modifie_le = now()
  where id = id_match;
  return coalesce(new, old);
end;
$$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'tir_au_but_score') then
    create trigger tir_au_but_score after insert or delete on tirs_au_but
      for each row execute function prive.tir_au_but();
  end if;
end $$;
