-- Encadrement des clubs (président, coach, adjoint) et leurs cartes, mercato,
-- annonces du comité. À exécuter après 0003_clubs_licences.sql.

-- Colonnes du mercato (utilisées aussi par la vérification des cartes plus bas).
alter table tournoi add column if not exists mercato_ouvert boolean not null default false;
alter table clubs add column if not exists disqualifie boolean not null default false;
alter table joueurs add column if not exists transfere boolean not null default false;

-- ---------------------------------------------------------------------------
-- Encadrement : un président, un coach et un adjoint par club, chacun avec sa carte
-- ---------------------------------------------------------------------------
create sequence if not exists numero_carte_seq;

create table if not exists encadrants (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  fonction text not null check (fonction in ('président', 'coach', 'adjoint')),
  nom text not null check (char_length(nom) between 1 and 60),
  prenoms text not null check (char_length(prenoms) between 1 and 80),
  telephone text check (char_length(telephone) <= 20),
  valide boolean not null default false,
  numero_carte text unique,
  cree_le timestamptz not null default now(),
  unique (club_id, fonction)
);

-- Le président d'un club ajoute son coach et son adjoint ; seul le comité valide les cartes.
create or replace function prive.regles_encadrant()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not prive.a_le_role('{comite}') then
    if new.fonction = 'président' then
      raise exception 'La fiche du président est créée par le comité.' using errcode = 'P0001';
    end if;
    new.valide := false;
    new.numero_carte := case when tg_op = 'UPDATE' then old.numero_carte end;
    if tg_op = 'UPDATE' and new.club_id <> old.club_id then
      raise exception 'Changement de club impossible.' using errcode = 'P0001';
    end if;
  end if;
  if new.valide and new.numero_carte is null then
    new.numero_carte := 'BDC-' || to_char(now(), 'YY') || '-E' || lpad(nextval('numero_carte_seq')::text, 3, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists regles_encadrant on encadrants;
create trigger regles_encadrant before insert or update on encadrants
  for each row execute function prive.regles_encadrant();

alter table encadrants enable row level security;
drop policy if exists "encadrants lus par leur club ou le comité" on encadrants;
drop policy if exists "encadrants ajoutés par leur club ou le comité" on encadrants;
drop policy if exists "encadrants modifiés par leur club ou le comité" on encadrants;
drop policy if exists "encadrants retirés par leur club ou le comité" on encadrants;
create policy "encadrants lus par leur club ou le comité" on encadrants for select
  using (club_id = prive.club_du_president() or prive.a_le_role('{comite}'));
create policy "encadrants ajoutés par leur club ou le comité" on encadrants for insert
  with check (club_id = prive.club_du_president() or prive.a_le_role('{comite}'));
-- Une carte validée n'est plus modifiable par le club.
create policy "encadrants modifiés par leur club ou le comité" on encadrants for update
  using ((club_id = prive.club_du_president() and not valide and fonction <> 'président') or prive.a_le_role('{comite}'))
  with check (club_id = prive.club_du_president() or prive.a_le_role('{comite}'));
create policy "encadrants retirés par leur club ou le comité" on encadrants for delete
  using ((club_id = prive.club_du_president() and fonction <> 'président') or prive.a_le_role('{comite}'));

-- La vérification par QR code couvre aussi les cartes de l'encadrement.
drop function if exists verifier_licence(text);
create or replace function verifier_licence(p_numero text)
returns table (numero text, nom text, prenoms text, club text, poste text, active boolean)
language sql stable security definer set search_path = public
as $$
  select j.numero_licence, j.nom, j.prenoms, c.nom, j.poste, j.etat = 'active'
  from joueurs j join clubs c on c.id = j.club_id
  where j.numero_licence = upper(trim(p_numero))
  union all
  select e.numero_carte, e.nom, e.prenoms, c.nom,
    case e.fonction when 'président' then 'Président du club' when 'coach' then 'Coach' else 'Coach adjoint' end,
    e.valide and not c.disqualifie
  from encadrants e join clubs c on c.id = e.club_id
  where e.numero_carte = upper(trim(p_numero));
$$;
grant execute on function verifier_licence(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Mercato : un joueur ne peut être transféré qu'une seule fois
-- ---------------------------------------------------------------------------

create table if not exists transferts (
  id uuid primary key default gen_random_uuid(),
  joueur_id uuid not null references joueurs(id) on delete cascade,
  -- Copiés à la demande : le club acheteur ne lit pas les fiches des joueurs des autres clubs.
  joueur text not null,
  numero_licence text not null,
  club_depart uuid not null references clubs(id) on delete cascade,
  club_arrivee uuid not null references clubs(id) on delete cascade,
  montant_fcfa int check (montant_fcfa >= 0),
  statut text not null default 'demandé' check (statut in ('demandé', 'accepté par le club', 'validé', 'refusé')),
  cree_le timestamptz not null default now(),
  traite_le timestamptz
);
-- Une seule demande en cours par joueur.
create unique index if not exists transfert_en_cours on transferts (joueur_id) where statut in ('demandé', 'accepté par le club');

alter table transferts enable row level security;
drop policy if exists "transferts lus par les clubs concernés ou le comité" on transferts;
create policy "transferts lus par les clubs concernés ou le comité" on transferts for select
  using (prive.club_du_president() in (club_depart, club_arrivee) or prive.a_le_role('{comite}'));
-- Pas d'écriture directe : tout passe par les fonctions ci-dessous, qui appliquent les règles.

-- Le club acheteur demande un joueur, identifié par son numéro de licence.
create or replace function demander_transfert(p_numero text, p_montant int default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  moi uuid := prive.club_du_president();
  j joueurs;
  id_transfert uuid;
begin
  if moi is null then raise exception 'Réservé aux présidents de club.' using errcode = 'P0001'; end if;
  if not (select mercato_ouvert from tournoi where id = 1) then
    raise exception 'Le mercato est fermé.' using errcode = 'P0001';
  end if;
  if (select disqualifie from clubs where id = moi) then
    raise exception 'Un club disqualifié ne peut pas recruter.' using errcode = 'P0001';
  end if;
  select * into j from joueurs where numero_licence = upper(trim(p_numero));
  if not found or j.etat <> 'active' then
    raise exception 'Aucune licence active ne correspond à ce numéro.' using errcode = 'P0001';
  end if;
  if j.club_id = moi then raise exception 'Ce joueur est déjà dans votre club.' using errcode = 'P0001'; end if;
  if j.transfere then
    raise exception 'Ce joueur a déjà été transféré une fois : il ne peut plus changer de club, même si son équipe est disqualifiée.' using errcode = 'P0001';
  end if;
  insert into transferts (joueur_id, joueur, numero_licence, club_depart, club_arrivee, montant_fcfa)
    values (j.id, j.prenoms || ' ' || j.nom, j.numero_licence, j.club_id, moi, p_montant) returning id into id_transfert;
  return id_transfert;
exception when unique_violation then
  raise exception 'Une demande de transfert est déjà en cours pour ce joueur.' using errcode = 'P0001';
end;
$$;

-- Le club vendeur accepte ou refuse.
create or replace function repondre_transfert(p_id uuid, p_accepte boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update transferts set statut = case when p_accepte then 'accepté par le club' else 'refusé' end,
    traite_le = case when p_accepte then null else now() end
  where id = p_id and statut = 'demandé' and club_depart = prive.club_du_president();
  if not found then raise exception 'Demande introuvable ou déjà traitée.' using errcode = 'P0001'; end if;
end;
$$;

-- Le comité valide : le joueur rejoint son nouveau club, définitivement.
-- Si le club vendeur est disqualifié, son accord n'est pas nécessaire.
create or replace function valider_transfert(p_id uuid, p_valide boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare t transferts;
begin
  if not prive.a_le_role('{comite}') then raise exception 'Réservé au comité.' using errcode = 'P0001'; end if;
  select * into t from transferts where id = p_id and statut in ('demandé', 'accepté par le club') for update;
  if not found then raise exception 'Demande introuvable ou déjà traitée.' using errcode = 'P0001'; end if;
  if not p_valide then
    update transferts set statut = 'refusé', traite_le = now() where id = p_id;
    return;
  end if;
  if t.statut = 'demandé' and not (select disqualifie from clubs where id = t.club_depart) then
    raise exception 'Le club vendeur n''a pas encore donné son accord.' using errcode = 'P0001';
  end if;
  if (select transfere from joueurs where id = t.joueur_id) then
    raise exception 'Ce joueur a déjà été transféré une fois.' using errcode = 'P0001';
  end if;
  update joueurs set club_id = t.club_arrivee, transfere = true where id = t.joueur_id;
  update transferts set statut = 'validé', traite_le = now() where id = p_id;
end;
$$;

revoke execute on function demander_transfert(text, int) from public, anon;
revoke execute on function repondre_transfert(uuid, boolean) from public, anon;
revoke execute on function valider_transfert(uuid, boolean) from public, anon;
grant execute on function demander_transfert(text, int) to authenticated;
grant execute on function repondre_transfert(uuid, boolean) to authenticated;
grant execute on function valider_transfert(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Annonces du comité : incident, annulation, report… affichées sur le site
-- et envoyées aux abonnés WhatsApp
-- ---------------------------------------------------------------------------
create table if not exists alertes (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'info' check (type in ('info', 'incident', 'annulation', 'report', 'calendrier')),
  titre text not null check (char_length(titre) between 2 and 120),
  texte text not null default '' check (char_length(texte) <= 1000),
  match_id uuid references matchs(id) on delete set null,
  publiee_le timestamptz not null default now(),
  envoyee_le timestamptz
);
create index if not exists alertes_recentes on alertes (publiee_le desc);

-- Le comité envoie les annonces : il doit pouvoir lire les numéros des abonnés.
drop policy if exists "abonnés lus par médias" on abonnes_alertes;
drop policy if exists "abonnés lus par médias et comité" on abonnes_alertes;
create policy "abonnés lus par médias et comité" on abonnes_alertes for select using (prive.a_le_role('{medias,comite}'));

alter table alertes enable row level security;
drop policy if exists "alertes publiques" on alertes;
drop policy if exists "alertes gérées par comité" on alertes;
create policy "alertes publiques" on alertes for select using (true);
create policy "alertes gérées par comité" on alertes for all
  using (prive.a_le_role('{comite}')) with check (prive.a_le_role('{comite}'));

-- Un match annulé, reporté ou interrompu crée automatiquement une annonce.
create or replace function prive.annonce_statut_match()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare affiche text;
begin
  if new.statut is distinct from old.statut and new.statut in ('annulé', 'reporté', 'interrompu') then
    select d.nom || ' – ' || e.nom into affiche from clubs d, clubs e where d.id = new.club_domicile and e.id = new.club_exterieur;
    insert into alertes (type, titre, texte, match_id) values (
      case new.statut when 'annulé' then 'annulation' when 'reporté' then 'report' else 'incident' end,
      'Match ' || new.statut || ' : ' || affiche,
      'Le match ' || affiche || ' prévu le ' || to_char(new.date_heure, 'DD/MM à HH24"h"MI') || ' est ' || new.statut || '. Plus d''informations sur le site.',
      new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists annonce_statut_match on matchs;
create trigger annonce_statut_match after update on matchs
  for each row execute function prive.annonce_statut_match();
