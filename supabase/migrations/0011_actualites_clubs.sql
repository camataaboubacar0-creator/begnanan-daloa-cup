-- Pages publiques des clubs : effectif visible de tous, actualités publiées par les présidents
-- (photos d'entraînement, joueurs…), commentaires et « j'aime » du public.
-- À exécuter après 0010 ; peut être rejoué sans risque.

-- Effectif public : joueurs à licence active, sans date de naissance ni numéro de licence.
create or replace function effectif_public(p_club uuid)
returns table (id uuid, nom text, prenoms text, poste text, numero_maillot int, photo_url text)
language sql stable security definer set search_path = public
as $$
  select j.id, j.nom, j.prenoms, j.poste, j.numero_maillot, j.photo_url
  from joueurs j
  where j.club_id = p_club and j.etat = 'active'
  order by j.numero_maillot nulls last, j.nom;
$$;
grant execute on function effectif_public(uuid) to anon, authenticated;

create table if not exists actualites_club (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  texte text not null check (char_length(texte) between 1 and 2000),
  image_url text check (image_url ~ '^https://'),
  masquee boolean not null default false,
  -- Tenus à jour par la base (commentaires visibles, « j'aime »).
  nb_commentaires int not null default 0,
  nb_jaime int not null default 0,
  cree_le timestamptz not null default now()
);
create index if not exists actualites_club_club_idx on actualites_club (club_id, cree_le desc);
create index if not exists actualites_club_date_idx on actualites_club (cree_le desc);

-- Commentaires du public : écrits par le site (clé de service) après contrôle anti-abus,
-- jamais directement depuis le navigateur. L'empreinte (adresse IP chiffrée) n'est pas lisible.
create table if not exists commentaires_club (
  id uuid primary key default gen_random_uuid(),
  actualite_id uuid not null references actualites_club(id) on delete cascade,
  auteur text not null check (char_length(auteur) between 1 and 60),
  texte text not null check (char_length(texte) between 1 and 500),
  empreinte text,
  masque boolean not null default false,
  cree_le timestamptz not null default now()
);
create index if not exists commentaires_club_actualite_idx on commentaires_club (actualite_id, cree_le);
create index if not exists commentaires_club_empreinte_idx on commentaires_club (empreinte, cree_le);

-- Un « j'aime » par visiteur (identifiant anonyme gardé dans un cookie) et par actualité.
create table if not exists jaimes_club (
  actualite_id uuid not null references actualites_club(id) on delete cascade,
  visiteur uuid not null,
  cree_le timestamptz not null default now(),
  primary key (actualite_id, visiteur)
);

alter table actualites_club enable row level security;
alter table commentaires_club enable row level security;
alter table jaimes_club enable row level security;

-- Le président modifie le texte, la photo ou masque ; les compteurs restent à la base.
revoke update on actualites_club from anon, authenticated;
grant update (texte, image_url, masquee) on actualites_club to authenticated;
revoke all on commentaires_club from anon, authenticated;
grant select (id, actualite_id, auteur, texte, masque, cree_le) on commentaires_club to anon, authenticated;
grant update (masque) on commentaires_club to authenticated;
grant delete on commentaires_club to authenticated;
revoke all on jaimes_club from anon, authenticated;

-- Club de l'actualité modérable par la personne connectée (président du club, comité ou médias).
create or replace function prive.peut_moderer(p_club uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select p_club = prive.club_du_president() or prive.a_le_role('{comite,medias}');
$$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'actualites_club' and policyname = 'actualités publiques') then
    create policy "actualités publiques" on actualites_club for select
      using (not masquee or prive.peut_moderer(club_id));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'actualites_club' and policyname = 'actualités publiées par leur club') then
    create policy "actualités publiées par leur club" on actualites_club for insert to authenticated
      with check (club_id = prive.club_du_president() or prive.a_le_role('{comite}'));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'actualites_club' and policyname = 'actualités modifiées par leur club') then
    create policy "actualités modifiées par leur club" on actualites_club for update to authenticated
      using (prive.peut_moderer(club_id)) with check (prive.peut_moderer(club_id));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'actualites_club' and policyname = 'actualités retirées par leur club') then
    create policy "actualités retirées par leur club" on actualites_club for delete to authenticated
      using (prive.peut_moderer(club_id));
  end if;

  if not exists (select 1 from pg_policies where tablename = 'commentaires_club' and policyname = 'commentaires publics') then
    create policy "commentaires publics" on commentaires_club for select
      using (exists (select 1 from actualites_club a where a.id = actualite_id
        and ((not a.masquee and not masque) or prive.peut_moderer(a.club_id))));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'commentaires_club' and policyname = 'commentaires modérés par le club') then
    create policy "commentaires modérés par le club" on commentaires_club for update to authenticated
      using (exists (select 1 from actualites_club a where a.id = actualite_id and prive.peut_moderer(a.club_id)))
      with check (exists (select 1 from actualites_club a where a.id = actualite_id and prive.peut_moderer(a.club_id)));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'commentaires_club' and policyname = 'commentaires supprimés par le club') then
    create policy "commentaires supprimés par le club" on commentaires_club for delete to authenticated
      using (exists (select 1 from actualites_club a where a.id = actualite_id and prive.peut_moderer(a.club_id)));
  end if;
end $$;

-- Compteurs affichés sur les cartes.
create or replace function prive.compter_reactions()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  id_actu uuid := coalesce(new.actualite_id, old.actualite_id);
begin
  if tg_table_name = 'commentaires_club' then
    update actualites_club set nb_commentaires =
      (select count(*) from commentaires_club where actualite_id = id_actu and not masque)
    where id = id_actu;
  else
    update actualites_club set nb_jaime = (select count(*) from jaimes_club where actualite_id = id_actu)
    where id = id_actu;
  end if;
  return null;
end;
$$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'commentaires_club_compte') then
    create trigger commentaires_club_compte after insert or update of masque or delete on commentaires_club
      for each row execute function prive.compter_reactions();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'jaimes_club_compte') then
    create trigger jaimes_club_compte after insert or delete on jaimes_club
      for each row execute function prive.compter_reactions();
  end if;
end $$;
