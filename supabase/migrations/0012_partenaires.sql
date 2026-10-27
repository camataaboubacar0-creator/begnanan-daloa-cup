-- Partenaires (sponsors) du tournoi : logos affichés sur l'accueil et en bas de chaque page.
-- Gérés par le comité et les médias. À exécuter après 0011 ; peut être rejoué sans risque.

create table if not exists partenaires (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (char_length(nom) between 1 and 80),
  logo_url text not null check (logo_url ~ '^https://'),
  lien_url text check (lien_url ~ '^https://'),
  niveau text not null default 'officiel' check (niveau in ('principal', 'officiel', 'soutien')),
  ordre int not null default 0,
  visible boolean not null default true,
  cree_le timestamptz not null default now()
);

alter table partenaires enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'partenaires' and policyname = 'partenaires publics') then
    create policy "partenaires publics" on partenaires for select using (visible or prive.a_le_role('{comite,medias}'));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'partenaires' and policyname = 'partenaires gérés par comité et médias') then
    create policy "partenaires gérés par comité et médias" on partenaires for all to authenticated
      using (prive.a_le_role('{comite,medias}')) with check (prive.a_le_role('{comite,medias}'));
  end if;
end $$;
