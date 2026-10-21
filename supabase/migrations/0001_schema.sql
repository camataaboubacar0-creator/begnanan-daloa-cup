-- BÊGNANAN DALOA CUP : schéma de la base de données
-- À exécuter une fois dans Supabase (SQL Editor) sur un projet vide.
-- Toutes les tables ont la sécurité par ligne (RLS) activée : les droits sont vérifiés
-- par la base elle-même, pas seulement par le site.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profils des organisateurs et rôles
-- ---------------------------------------------------------------------------
create type role_organisateur as enum ('admin', 'comite', 'billetterie', 'medias');

create table profils (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nom text not null,
  role role_organisateur not null,
  actif boolean not null default true,
  cree_le timestamptz not null default now()
);

-- Vrai si l'utilisateur connecté a l'un des rôles demandés (l'admin a tous les droits).
-- Rangée dans un schéma non exposé par l'API : elle ne sert qu'aux règles de sécurité.
create schema if not exists prive;
grant usage on schema prive to anon, authenticated;

create or replace function prive.a_le_role(roles role_organisateur[])
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from profils
    where user_id = auth.uid() and actif
      and (role = 'admin' or role = any(roles))
  );
$$;

-- ---------------------------------------------------------------------------
-- Paramètres du tournoi (une seule ligne)
-- ---------------------------------------------------------------------------
create table tournoi (
  id int primary key default 1 check (id = 1),
  nom text not null default 'BÊGNANAN DALOA CUP',
  lieu text not null default 'Espace CP1–Orly, Daloa',
  date_debut date not null default '2026-11-22',
  date_fin date not null default '2027-01-01',
  dates_confirmees boolean not null default false,
  accroche text not null default '',
  capacite_clubs int not null default 32,
  modifie_le timestamptz not null default now()
);
insert into tournoi (id, accroche) values (1,
  '32 équipes, un terrain de latérite et un seul trophée. Suivez les matchs, les résultats et les classements de la compétition, en direct depuis votre téléphone.');

-- ---------------------------------------------------------------------------
-- Clubs et matchs
-- ---------------------------------------------------------------------------
create table clubs (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  sigle text not null check (char_length(sigle) between 2 and 4),
  couleur text not null default '#11802c',
  poule text check (poule ~ '^[A-H]$'),
  quartier text,
  logo_url text,
  presentation text,
  cree_le timestamptz not null default now()
);

create type statut_match as enum ('programmé', 'en cours', 'terminé', 'reporté', 'interrompu', 'annulé');

create table matchs (
  id uuid primary key default gen_random_uuid(),
  phase text not null default 'Poules',
  poule text check (poule ~ '^[A-H]$'),
  club_domicile uuid not null references clubs(id),
  club_exterieur uuid not null references clubs(id),
  date_heure timestamptz not null,
  terrain text not null default 'Terrain A',
  statut statut_match not null default 'programmé',
  buts_domicile int check (buts_domicile >= 0),
  buts_exterieur int check (buts_exterieur >= 0),
  -- Le résultat n'est officiel qu'après validation du comité.
  resultat_valide boolean not null default false,
  modifie_le timestamptz not null default now(),
  check (club_domicile <> club_exterieur)
);
create index on matchs (date_heure);

-- ---------------------------------------------------------------------------
-- Billetterie
-- ---------------------------------------------------------------------------
create table categories_billet (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  description text not null default '',
  prix_fcfa int not null check (prix_fcfa >= 0),
  places_par_match int not null check (places_par_match >= 0),
  en_vente boolean not null default false,
  ordre int not null default 0
);

create type statut_commande as enum ('en attente', 'payée', 'échouée', 'annulée');

create table commandes (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  match_id uuid not null references matchs(id),
  categorie_id uuid not null references categories_billet(id),
  quantite int not null check (quantite between 1 and 10),
  -- Le prix payé est figé : un changement de tarif ne réécrit jamais une vente.
  prix_unitaire_fcfa int not null,
  total_fcfa int not null,
  nom_acheteur text not null,
  telephone text not null,
  moyen_paiement text,
  statut statut_commande not null default 'en attente',
  transaction_id text unique,
  entrees_validees int not null default 0 check (entrees_validees >= 0),
  cree_le timestamptz not null default now(),
  check (entrees_validees <= quantite)
);
create index on commandes (match_id, categorie_id) where statut = 'payée';

-- ---------------------------------------------------------------------------
-- Médias : débriefs, annonces, hommes du match, galerie
-- ---------------------------------------------------------------------------
create type type_publication as enum ('debrief', 'annonce', 'hdm');

create table publications (
  id uuid primary key default gen_random_uuid(),
  type type_publication not null,
  titre text not null,
  texte text not null default '',
  match_id uuid references matchs(id) on delete set null,
  joueur text,
  club_id uuid references clubs(id) on delete set null,
  video_url text check (video_url is null or video_url ~ '^https://'),
  publiee boolean not null default false,
  publiee_le timestamptz,
  cree_le timestamptz not null default now(),
  check (type <> 'hdm' or (joueur is not null and club_id is not null))
);

create table galerie (
  id uuid primary key default gen_random_uuid(),
  image_url text,
  legende text not null default '',
  ordre int not null default 0,
  publiee boolean not null default true
);

create table abonnes_alertes (
  id uuid primary key default gen_random_uuid(),
  nom text,
  telephone text not null unique,
  club_id uuid references clubs(id) on delete set null,
  types text[] not null default '{resultats,annonces}',
  cree_le timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Classement calculé à partir des seuls résultats validés
-- (barème provisoire 3/1/0, à confirmer par le comité)
-- ---------------------------------------------------------------------------
-- security_invoker : la vue applique les droits de la personne qui la lit.
create view classement
with (security_invoker = true) as
with r as (
  select poule, club_domicile as club, buts_domicile as bp, buts_exterieur as bc from matchs
    where statut = 'terminé' and resultat_valide and phase = 'Poules'
  union all
  select poule, club_exterieur, buts_exterieur, buts_domicile from matchs
    where statut = 'terminé' and resultat_valide and phase = 'Poules'
)
select c.poule, c.id as club_id, c.nom, c.sigle, c.couleur,
  count(r.club)::int as joues,
  count(*) filter (where r.bp > r.bc)::int as gagnes,
  count(*) filter (where r.bp = r.bc)::int as nuls,
  count(*) filter (where r.bp < r.bc)::int as perdus,
  coalesce(sum(r.bp), 0)::int as buts_pour,
  coalesce(sum(r.bc), 0)::int as buts_contre,
  (coalesce(sum(r.bp), 0) - coalesce(sum(r.bc), 0))::int as difference,
  (3 * count(*) filter (where r.bp > r.bc) + count(*) filter (where r.bp = r.bc))::int as points
from clubs c left join r on r.club = c.id
where c.poule is not null
group by c.poule, c.id;

-- Places restantes d'un match par catégorie (ventes payées ou en attente déduites).
-- Fonction plutôt que vue : elle lit les commandes, qui ne sont pas publiques,
-- mais ne renvoie que des totaux.
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

-- ---------------------------------------------------------------------------
-- Sécurité par ligne
-- ---------------------------------------------------------------------------
alter table profils enable row level security;
alter table tournoi enable row level security;
alter table clubs enable row level security;
alter table matchs enable row level security;
alter table categories_billet enable row level security;
alter table commandes enable row level security;
alter table publications enable row level security;
alter table galerie enable row level security;
alter table abonnes_alertes enable row level security;

-- Profils : chacun lit le sien, l'admin gère tout
create policy "profil lu par soi" on profils for select using (user_id = auth.uid() or prive.a_le_role('{admin}'));
create policy "profils gérés par admin" on profils for all using (prive.a_le_role('{admin}')) with check (prive.a_le_role('{admin}'));

-- Lecture publique de ce qui est publiable
create policy "tournoi public" on tournoi for select using (true);
create policy "clubs publics" on clubs for select using (true);
create policy "matchs publics" on matchs for select using (true);
create policy "catégories en vente publiques" on categories_billet for select using (en_vente or prive.a_le_role('{billetterie}'));
create policy "publications publiées" on publications for select using (publiee or prive.a_le_role('{medias}'));
create policy "galerie publiée" on galerie for select using (publiee or prive.a_le_role('{medias}'));

-- Écritures selon le rôle
create policy "tournoi modifié par comité" on tournoi for update using (prive.a_le_role('{comite}')) with check (prive.a_le_role('{comite}'));
create policy "clubs gérés par comité" on clubs for all using (prive.a_le_role('{comite}')) with check (prive.a_le_role('{comite}'));
create policy "matchs gérés par comité" on matchs for all using (prive.a_le_role('{comite}')) with check (prive.a_le_role('{comite}'));
create policy "catégories gérées par billetterie" on categories_billet for all using (prive.a_le_role('{billetterie}')) with check (prive.a_le_role('{billetterie}'));
create policy "publications gérées par médias" on publications for all using (prive.a_le_role('{medias}')) with check (prive.a_le_role('{medias}'));
create policy "galerie gérée par médias" on galerie for all using (prive.a_le_role('{medias}')) with check (prive.a_le_role('{medias}'));

-- Commandes : jamais lisibles par le public. Elles sont créées et confirmées
-- uniquement par le serveur (clé de service), après retour du prestataire de paiement.
create policy "commandes lues par billetterie" on commandes for select using (prive.a_le_role('{billetterie}'));

-- Alertes : n'importe qui peut s'inscrire, seuls les médias lisent la liste
create policy "inscription aux alertes" on abonnes_alertes for insert with check (true);
create policy "abonnés lus par médias" on abonnes_alertes for select using (prive.a_le_role('{medias}'));

grant select on classement to anon, authenticated;
grant execute on function places_restantes(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Contrôle à l'entrée : valide une entrée de façon atomique (pas de double passage)
-- ---------------------------------------------------------------------------
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

-- Réservé aux organisateurs connectés.
revoke execute on function valider_entree(text) from public, anon;
grant execute on function valider_entree(text) to authenticated;
