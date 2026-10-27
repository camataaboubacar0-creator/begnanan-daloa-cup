-- Médias : image d'aperçu et lien vers la publication complète (Facebook, Instagram, TikTok…).
-- Les images sont déposées par le serveur dans le stockage « photos ». Peut être rejoué sans risque.
alter table publications add column if not exists image_url text check (image_url ~ '^https://');
alter table publications add column if not exists lien_url text check (lien_url ~ '^https://');
