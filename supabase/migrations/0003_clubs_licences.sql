-- Inscription des clubs par leurs présidents et licences des joueurs.
-- À exécuter après 0001 (et 0002 si besoin), dans Supabase (SQL Editor).
--
-- Règles des licences :
--   * chaque club a un nombre de licences incluses (10 par défaut) ;
--   * au-delà, chaque licence est payante, au tarif fixé par le comité ; tant que ce tarif
--     n'est pas fixé, aucune licence payante ne peut être demandée ;
--   * une licence devient active quand le comité l'a validée sportivement ET, si elle est
--     payante, quand le paiement a été reçu. Les deux contrôles sont distincts.

-- ---------------------------------------------------------------------------
-- Paramètres du comité
-- ---------------------------------------------------------------------------
alter table tournoi
  add column if not exists licences_incluses int not null default 10 check (licences_incluses between 0 and 60),
  add column if not exists tarif_licence_fcfa int check (tarif_licence_fcfa >= 0);

-- ---------------------------------------------------------------------------
-- Demandes d'inscription déposées depuis le site par les présidents
-- ---------------------------------------------------------------------------
create table if not exists demandes_club (
  id uuid primary key default gen_random_uuid(),
  nom_club text not null check (char_length(nom_club) between 2 and 60),
  quartier text check (char_length(quartier) <= 60),
  president_nom text not null check (char_length(president_nom) between 2 and 80),
  telephone text not null check (telephone ~ '^\+?[0-9 ]{8,20}$'),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 120),
  message text check (char_length(message) <= 500),
  statut text not null default 'en attente' check (statut in ('en attente', 'acceptée', 'refusée')),
  club_id uuid references clubs(id) on delete set null,
  cree_le timestamptz not null default now(),
  traitee_le timestamptz
);

-- ---------------------------------------------------------------------------
-- Comptes des présidents : un compte par club, distinct des organisateurs
-- ---------------------------------------------------------------------------
create table if not exists presidents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  club_id uuid not null references clubs(id) on delete cascade,
  nom text not null,
  actif boolean not null default true,
  cree_le timestamptz not null default now()
);

-- Club du président connecté (null pour tout autre utilisateur).
create or replace function prive.club_du_president()
returns uuid
language sql stable security definer set search_path = public
as $$
  select club_id from presidents where user_id = auth.uid() and actif;
$$;

-- ---------------------------------------------------------------------------
-- Joueurs et licences
-- ---------------------------------------------------------------------------
do $$ begin
  create type etat_licence as enum ('brouillon', 'soumise', 'active', 'refusée');
exception when duplicate_object then null;
end $$;

create sequence if not exists numero_licence_seq;

create table if not exists joueurs (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  nom text not null check (char_length(nom) between 1 and 60),
  prenoms text not null check (char_length(prenoms) between 1 and 80),
  date_naissance date not null check (date_naissance > '1940-01-01'),
  poste text check (char_length(poste) <= 30),
  numero_maillot int check (numero_maillot between 1 and 99),
  etat etat_licence not null default 'brouillon',
  payante boolean not null default false,
  validation_sportive boolean not null default false,
  paiement_recu boolean not null default false,
  doublon_possible boolean not null default false,
  motif_refus text check (char_length(motif_refus) <= 300),
  numero_licence text unique,
  soumise_le timestamptz,
  activee_le timestamptz,
  cree_le timestamptz not null default now()
);
create index if not exists joueurs_club on joueurs (club_id);

-- Calcule tout ce que le président ne doit pas pouvoir décider lui-même.
create or replace function prive.regles_licence()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  comite boolean := prive.a_le_role('{comite}');
  t tournoi;
  deja int;
begin
  if not comite then
    -- Le président ne touche ni aux contrôles du comité ni au numéro.
    new.validation_sportive := coalesce(case when tg_op = 'UPDATE' then old.validation_sportive end, false);
    new.paiement_recu := coalesce(case when tg_op = 'UPDATE' then old.paiement_recu end, false);
    new.numero_licence := case when tg_op = 'UPDATE' then old.numero_licence end;
    new.doublon_possible := coalesce(case when tg_op = 'UPDATE' then old.doublon_possible end, false);
    new.payante := coalesce(case when tg_op = 'UPDATE' then old.payante end, false);
    if tg_op = 'UPDATE' and new.club_id <> old.club_id then
      raise exception 'Un joueur ne peut pas changer de club.';
    end if;
    if new.etat not in ('brouillon', 'soumise') then
      raise exception 'Seul le comité peut activer ou refuser une licence.';
    end if;
  end if;

  -- Dépôt de la demande de licence : rang dans le quota du club et contrôle des doublons.
  if new.etat = 'soumise' and (tg_op = 'INSERT' or old.etat not in ('soumise', 'active')) then
    select * into t from tournoi where id = 1;
    select count(*) into deja from joueurs
      where club_id = new.club_id and etat in ('soumise', 'active') and id <> new.id;
    new.payante := deja >= t.licences_incluses;
    if new.payante and t.tarif_licence_fcfa is null then
      raise exception 'Le comité n''a pas encore fixé le tarif des licences supplémentaires : seules les % premières licences peuvent être demandées.', t.licences_incluses
        using errcode = 'P0001', hint = 'tarif_non_fixe';
    end if;
    new.soumise_le := now();
    new.motif_refus := null;
    new.doublon_possible := exists (
      select 1 from joueurs j
      where j.id <> new.id and j.club_id <> new.club_id and j.etat <> 'refusée'
        and lower(trim(j.nom)) = lower(trim(new.nom))
        and lower(trim(j.prenoms)) = lower(trim(new.prenoms))
        and j.date_naissance = new.date_naissance
    );
  end if;

  -- Activation dès que les deux contrôles sont faits ; retour en attente si l'un est retiré.
  if new.etat in ('soumise', 'active') then
    if new.validation_sportive and (not new.payante or new.paiement_recu) then
      if new.etat = 'soumise' then
        new.etat := 'active';
        new.activee_le := now();
        if new.numero_licence is null then
          new.numero_licence := 'BDC-' || to_char(now(), 'YY') || '-' || lpad(nextval('numero_licence_seq')::text, 4, '0');
        end if;
      end if;
    elsif new.etat = 'active' then
      new.etat := 'soumise';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists regles_licence on joueurs;
create trigger regles_licence before insert or update on joueurs
  for each row execute function prive.regles_licence();

-- Vérification publique d'une licence (QR code de la carte) : informations minimales.
create or replace function verifier_licence(p_numero text)
returns table (numero text, nom text, prenoms text, club text, poste text, active boolean)
language sql stable security definer set search_path = public
as $$
  select j.numero_licence, j.nom, j.prenoms, c.nom, j.poste, j.etat = 'active'
  from joueurs j join clubs c on c.id = j.club_id
  where j.numero_licence = upper(trim(p_numero));
$$;
grant execute on function verifier_licence(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Sécurité par ligne
-- ---------------------------------------------------------------------------
alter table demandes_club enable row level security;
alter table presidents enable row level security;
alter table joueurs enable row level security;

drop policy if exists "demande déposée par tous" on demandes_club;
drop policy if exists "demandes gérées par comité" on demandes_club;
create policy "demande déposée par tous" on demandes_club for insert to anon, authenticated
  with check (statut = 'en attente' and club_id is null and traitee_le is null);
create policy "demandes gérées par comité" on demandes_club for all
  using (prive.a_le_role('{comite}')) with check (prive.a_le_role('{comite}'));

-- Les comptes de présidents sont créés côté serveur (clé de service).
drop policy if exists "président lu par soi ou le comité" on presidents;
create policy "président lu par soi ou le comité" on presidents for select
  using (user_id = auth.uid() or prive.a_le_role('{comite}'));

drop policy if exists "joueurs lus par leur club ou le comité" on joueurs;
drop policy if exists "joueurs ajoutés par leur club ou le comité" on joueurs;
drop policy if exists "joueurs modifiés par leur club ou le comité" on joueurs;
drop policy if exists "joueurs retirés par leur club ou le comité" on joueurs;
create policy "joueurs lus par leur club ou le comité" on joueurs for select
  using (club_id = prive.club_du_president() or prive.a_le_role('{comite}'));
create policy "joueurs ajoutés par leur club ou le comité" on joueurs for insert
  with check (club_id = prive.club_du_president() or prive.a_le_role('{comite}'));
-- Un président ne modifie que les brouillons et les licences refusées (pour les corriger).
create policy "joueurs modifiés par leur club ou le comité" on joueurs for update
  using ((club_id = prive.club_du_president() and etat in ('brouillon', 'refusée')) or prive.a_le_role('{comite}'))
  with check (club_id = prive.club_du_president() or prive.a_le_role('{comite}'));
create policy "joueurs retirés par leur club ou le comité" on joueurs for delete
  using ((club_id = prive.club_du_president() and etat in ('brouillon', 'refusée')) or prive.a_le_role('{comite}'));
