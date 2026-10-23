-- La date de naissance des joueurs n'est plus demandée (ni à l'inscription ni dans l'espace club).
-- Les fiches existantes la gardent. À exécuter après 0005 ; peut être rejoué sans risque.
alter table joueurs alter column date_naissance drop not null;

-- Contrôle des doublons entre clubs : sans date de naissance, on compare le nom et les prénoms.
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
        -- Même date de naissance, ou date inconnue d'un côté (elle n'est plus demandée).
        and (j.date_naissance = new.date_naissance or j.date_naissance is null or new.date_naissance is null)
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
