-- Espace club (modifications proposées par le président, acceptées par le comité), photos
-- (logo, encadrement, joueurs), inscription complète avec mot de passe choisi, messages.
-- À exécuter après 0004. Ne supprime rien : peut être rejoué sans risque.

-- ---------------------------------------------------------------------------
-- Photos
-- ---------------------------------------------------------------------------
alter table joueurs add column if not exists photo_url text check (photo_url ~ '^https://');
alter table encadrants add column if not exists photo_url text check (photo_url ~ '^https://');

-- Stockage des images : lecture publique (cartes imprimées, vérification par QR code),
-- 1 Mo maximum par fichier ; le site réduit les photos avant l'envoi.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Un président dépose les images dans le dossier de son club ; le comité partout.
-- (Les images jointes à une demande d'inscription sont déposées par le serveur.)
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'photos déposées par leur club ou le comité') then
    create policy "photos déposées par leur club ou le comité" on storage.objects for insert to authenticated
      with check (bucket_id = 'photos' and ((storage.foldername(name))[1] = prive.club_du_president()::text or prive.a_le_role('{comite}')));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Demande d'inscription complète : compte créé à l'envoi (mot de passe choisi par le
-- président, inactif tant que le comité n'a pas accepté), encadrement et joueurs.
-- ---------------------------------------------------------------------------
alter table demandes_club
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists identifiant text check (char_length(identifiant) <= 120),
  add column if not exists president_prenoms text check (char_length(president_prenoms) <= 80),
  add column if not exists logo_url text check (logo_url ~ '^https://'),
  add column if not exists president_photo_url text check (president_photo_url ~ '^https://'),
  -- [{fonction: 'coach'|'adjoint', nom, prenoms, telephone, photo_url}]
  add column if not exists encadrement jsonb not null default '[]' check (jsonb_typeof(encadrement) = 'array' and jsonb_array_length(encadrement) <= 2),
  -- [{nom, prenoms, date_naissance, poste, numero_maillot, photo_url}]
  add column if not exists joueurs jsonb not null default '[]' check (jsonb_typeof(joueurs) = 'array' and jsonb_array_length(joueurs) <= 40);

-- ---------------------------------------------------------------------------
-- Espace club : le président propose les modifications (profil du club, fiche d'un joueur
-- licencié ou d'un membre validé de l'encadrement, retrait) ; un membre du comité les accepte
-- ou les refuse. Les brouillons et fiches pas encore validées restent modifiables directement.
-- ---------------------------------------------------------------------------
create table if not exists modifications_club (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  objet text not null check (objet in ('profil', 'joueur', 'encadrant')),
  action text not null check (action in ('modifier', 'retirer')),
  -- Joueur ou encadrant concerné (null pour le profil du club).
  cible uuid,
  -- Profil : logo_url, couleur, quartier, presentation. Joueur : nom, prenoms, date_naissance,
  -- poste, numero_maillot, photo_url. Encadrant : nom, prenoms, telephone, photo_url.
  donnees jsonb not null default '{}' check (jsonb_typeof(donnees) = 'object'),
  -- Nom affiché (joueur ou encadrant) au moment de la demande.
  libelle text check (char_length(libelle) <= 160),
  statut text not null default 'en attente' check (statut in ('en attente', 'acceptée', 'refusée', 'annulée')),
  motif text check (char_length(motif) <= 300),
  demandeur uuid default auth.uid(),
  cree_le timestamptz not null default now(),
  traitee_le timestamptz,
  traitee_par uuid,
  check ((objet = 'profil') = (cible is null)),
  check (objet <> 'profil' or action = 'modifier')
);
create index if not exists modifications_club_attente on modifications_club (statut, cree_le);

-- Une demande est déposée en attente, au nom du club du président, sur un élément de son club.
create or replace function prive.regles_modification()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.club_id is distinct from prive.club_du_president() then
      raise exception 'Vous ne pouvez proposer des modifications que pour votre club.' using errcode = 'P0001';
    end if;
    if new.objet = 'joueur' and not exists (select 1 from joueurs where id = new.cible and club_id = new.club_id) then
      raise exception 'Joueur introuvable.' using errcode = 'P0001';
    end if;
    if new.objet = 'encadrant' and not exists (select 1 from encadrants where id = new.cible and club_id = new.club_id) then
      raise exception 'Membre de l''encadrement introuvable.' using errcode = 'P0001';
    end if;
    if exists (select 1 from modifications_club where club_id = new.club_id and objet = new.objet
               and cible is not distinct from new.cible and statut = 'en attente') then
      raise exception 'Une demande est déjà en attente pour cet élément : attendez la réponse du comité ou annulez-la.' using errcode = 'P0001';
    end if;
    new.statut := 'en attente';
    new.motif := null;
    new.demandeur := auth.uid();
    new.cree_le := now();
    new.traitee_le := null;
    new.traitee_par := null;
  elsif not prive.a_le_role('{comite}') then
    -- Le président ne peut qu'annuler sa demande encore en attente.
    if old.statut <> 'en attente' or new.statut <> 'annulée'
       or (new.donnees, new.objet, new.action, new.cible, new.club_id) is distinct from (old.donnees, old.objet, old.action, old.cible, old.club_id) then
      raise exception 'Seul le comité traite les demandes de modification.' using errcode = 'P0001';
    end if;
    new.traitee_le := now();
  end if;
  return new;
end;
$$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'regles_modification') then
    create trigger regles_modification before insert or update on modifications_club for each row execute function prive.regles_modification();
  end if;
end $$;

alter table modifications_club enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'modifications_club' and policyname = 'modifications lues par leur club ou le comité') then
    create policy "modifications lues par leur club ou le comité" on modifications_club for select
      using (club_id = prive.club_du_president() or prive.a_le_role('{comite}'));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'modifications_club' and policyname = 'modifications proposées par leur club') then
    create policy "modifications proposées par leur club" on modifications_club for insert to authenticated
      with check (club_id = prive.club_du_president());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'modifications_club' and policyname = 'modifications annulées par leur club ou traitées par le comité') then
    create policy "modifications annulées par leur club ou traitées par le comité" on modifications_club for update to authenticated
      using (club_id = prive.club_du_president() or prive.a_le_role('{comite}'))
      with check (club_id = prive.club_du_president() or prive.a_le_role('{comite}'));
  end if;
end $$;

-- Le comité accepte (la modification est appliquée) ou refuse (avec un motif) une demande.
create or replace function traiter_modification(p_id uuid, p_accepter boolean, p_motif text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  m modifications_club;
  d jsonb;
begin
  if not prive.a_le_role('{comite}') then
    raise exception 'Réservé au comité.' using errcode = 'P0001';
  end if;
  select * into m from modifications_club where id = p_id and statut = 'en attente' for update;
  if not found then raise exception 'Demande introuvable ou déjà traitée.' using errcode = 'P0001'; end if;
  d := m.donnees;

  if p_accepter then
    if m.objet = 'profil' then
      if d->>'couleur' is not null and d->>'couleur' !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Couleur invalide.' using errcode = 'P0001'; end if;
      update clubs set
        logo_url = coalesce(d->>'logo_url', logo_url),
        couleur = coalesce(d->>'couleur', couleur),
        quartier = case when d ? 'quartier' then nullif(left(trim(d->>'quartier'), 60), '') else quartier end,
        presentation = case when d ? 'presentation' then nullif(left(trim(d->>'presentation'), 600), '') else presentation end
      where id = m.club_id;
    elsif m.objet = 'joueur' and m.action = 'retirer' then
      delete from joueurs where id = m.cible and club_id = m.club_id;
    elsif m.objet = 'joueur' then
      update joueurs set
        nom = coalesce(left(trim(d->>'nom'), 60), nom),
        prenoms = coalesce(left(trim(d->>'prenoms'), 80), prenoms),
        date_naissance = coalesce((d->>'date_naissance')::date, date_naissance),
        poste = case when d ? 'poste' then nullif(left(trim(d->>'poste'), 30), '') else poste end,
        numero_maillot = case when d ? 'numero_maillot' then (d->>'numero_maillot')::int else numero_maillot end,
        photo_url = coalesce(d->>'photo_url', photo_url)
      where id = m.cible and club_id = m.club_id;
    elsif m.action = 'retirer' then
      delete from encadrants where id = m.cible and club_id = m.club_id and fonction <> 'président';
    else
      update encadrants set
        nom = coalesce(left(trim(d->>'nom'), 60), nom),
        prenoms = coalesce(left(trim(d->>'prenoms'), 80), prenoms),
        telephone = case when d ? 'telephone' then nullif(left(trim(d->>'telephone'), 20), '') else telephone end,
        photo_url = coalesce(d->>'photo_url', photo_url)
      where id = m.cible and club_id = m.club_id;
    end if;
  end if;

  update modifications_club set
    statut = case when p_accepter then 'acceptée' else 'refusée' end,
    motif = case when p_accepter then null else nullif(left(trim(p_motif), 300), '') end,
    traitee_le = now(),
    traitee_par = auth.uid()
  where id = p_id;
end;
$$;
revoke execute on function traiter_modification(uuid, boolean, text) from public, anon;
grant execute on function traiter_modification(uuid, boolean, text) to authenticated;

-- Une carte d'encadrement validée ne se retire plus directement : le club en fait la demande.
create or replace function prive.garde_encadrant()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if old.valide and not prive.a_le_role('{comite}') then
    raise exception 'Cette carte est validée : demandez son retrait au comité.' using errcode = 'P0001';
  end if;
  return old;
end;
$$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'garde_encadrant') then
    create trigger garde_encadrant before delete on encadrants for each row execute function prive.garde_encadrant();
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Messages entre chaque club et le comité
-- ---------------------------------------------------------------------------
create table if not exists messages_club (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  de_comite boolean not null default false,
  auteur uuid default auth.uid(),
  auteur_nom text,
  texte text not null check (char_length(texte) between 1 and 1000),
  lu boolean not null default false,
  cree_le timestamptz not null default now()
);
create index if not exists messages_club_fil on messages_club (club_id, cree_le);

-- L'expéditeur, son nom et le sens du message sont fixés par la base, pas par le formulaire.
create or replace function prive.regles_message()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.de_comite := prive.a_le_role('{comite}');
  if not new.de_comite and new.club_id is distinct from prive.club_du_president() then
    raise exception 'Vous ne pouvez écrire qu''au nom de votre club.' using errcode = 'P0001';
  end if;
  new.auteur := auth.uid();
  new.auteur_nom := coalesce(
    (select nom from profils where user_id = auth.uid()),
    (select nom from presidents where user_id = auth.uid()));
  new.lu := false;
  new.cree_le := now();
  return new;
end;
$$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'regles_message') then
    create trigger regles_message before insert on messages_club for each row execute function prive.regles_message();
  end if;
end $$;

alter table messages_club enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'messages_club' and policyname = 'messages lus par leur club ou le comité') then
    create policy "messages lus par leur club ou le comité" on messages_club for select
      using (club_id = prive.club_du_president() or prive.a_le_role('{comite}'));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'messages_club' and policyname = 'messages écrits par leur club ou le comité') then
    create policy "messages écrits par leur club ou le comité" on messages_club for insert to authenticated
      with check (club_id = prive.club_du_president() or prive.a_le_role('{comite}'));
  end if;
end $$;

-- Marque comme lus les messages reçus (ceux de l'autre partie) dans le fil d'un club.
create or replace function marquer_messages_lus(p_club uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if prive.a_le_role('{comite}') then
    update messages_club set lu = true where club_id = p_club and not de_comite and not lu;
  elsif p_club = prive.club_du_president() then
    update messages_club set lu = true where club_id = p_club and de_comite and not lu;
  end if;
end;
$$;
revoke execute on function marquer_messages_lus(uuid) from public, anon;
grant execute on function marquer_messages_lus(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Vérification par QR code avec photo et logo, pour contrôler l'identité au stade
-- ---------------------------------------------------------------------------
create or replace function verifier_carte(p_numero text)
returns table (numero text, nom text, prenoms text, club text, poste text, active boolean, photo_url text, logo_url text)
language sql stable security definer set search_path = public
as $$
  select j.numero_licence, j.nom, j.prenoms, c.nom, j.poste, j.etat = 'active', j.photo_url, c.logo_url
  from joueurs j join clubs c on c.id = j.club_id
  where j.numero_licence = upper(trim(p_numero))
  union all
  select e.numero_carte, e.nom, e.prenoms, c.nom,
    case e.fonction when 'président' then 'Président du club' when 'coach' then 'Coach' else 'Coach adjoint' end,
    e.valide and not c.disqualifie, e.photo_url, c.logo_url
  from encadrants e join clubs c on c.id = e.club_id
  where e.numero_carte = upper(trim(p_numero));
$$;
grant execute on function verifier_carte(text) to anon, authenticated;
