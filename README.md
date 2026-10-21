# BÊGNANAN DALOA CUP

Site officiel du tournoi de maracana BÊGNANAN DALOA CUP (Daloa).

- **Côté supporters** : accueil avec compte à rebours et résultats en direct, calendrier filtrable, classements par poule calculés automatiquement, fiches des clubs, médias (débriefs vidéo, annonces, hommes du match, galerie), billetterie, infos pratiques et inscription aux alertes WhatsApp.
- **Côté présidents de club** : demande d'inscription du club (`/inscription-club`), puis, une fois acceptée par le comité, un espace pour inscrire les joueurs et demander leurs licences (10 incluses par club, les suivantes au tarif fixé par le comité). Chaque licence active a une carte avec un QR code de vérification.
- **Côté organisateurs** (`/admin`) : connexion par e-mail et mot de passe, droits selon le rôle (administrateur, comité, billetterie, médias). Paramètres du tournoi, clubs, matchs et scores avec validation, catégories et prix des billets, contrôle des billets à l'entrée, publications et galerie, gestion des comptes.

Technique : Next.js (React) hébergé sur Vercel, base de données et comptes sur Supabase. Les droits sont vérifiés par la base elle-même (sécurité par ligne), pas seulement par le site.

## Mise en ligne, étape par étape

Aucun mot de passe ni clé ne doit être envoyé par message : ils se saisissent uniquement dans Supabase et Vercel.

### 1. Base de données (Supabase, offre gratuite)

1. Créer un compte sur [supabase.com](https://supabase.com) puis un projet (région la plus proche : Europe).
2. Dans **SQL Editor**, coller tout le fichier [`supabase/migrations/0001_schema.sql`](supabase/migrations/0001_schema.sql) et cliquer sur **Run**. Si la base a été créée avec une version précédente de ce fichier, exécuter aussi [`0002_correctif_security_definer.sql`](supabase/migrations/0002_correctif_security_definer.sql). Exécuter ensuite [`0003_clubs_licences.sql`](supabase/migrations/0003_clubs_licences.sql) (inscription des clubs et licences).
3. Dans **Authentication → Users → Add user**, créer le premier compte administrateur (e-mail + mot de passe, cocher « Auto confirm »).
4. Dans **SQL Editor**, donner le rôle administrateur à ce compte :
   ```sql
   insert into profils (user_id, nom, role)
   select id, 'Votre nom', 'admin' from auth.users where email = 'votre@email.com';
   ```
5. Dans **Authentication → Sign In / Providers**, désactiver « Allow new users to sign up » : seuls les comptes créés depuis l'espace admin peuvent se connecter.
6. Dans **Project Settings → API**, noter l'URL du projet, la clé `anon` et la clé `service_role` (cette dernière reste secrète).

### 2. Hébergement (Vercel, offre gratuite)

1. Créer un compte sur [vercel.com](https://vercel.com) avec le compte GitHub, puis **Add New → Project** et importer ce dépôt.
2. Dans **Environment Variables**, ajouter les trois valeurs notées plus haut (voir [`.env.example`](.env.example)) :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Cliquer sur **Deploy**. Le site est en ligne à une adresse `….vercel.app` ; un nom de domaine (par exemple `begnanandaloacup.ci`) peut être branché ensuite dans **Settings → Domains**.

### 3. Premiers pas dans l'espace organisateurs

1. Aller sur `/admin`, se connecter avec le compte administrateur.
2. **Tournoi** : vérifier dates, lieu et accroche. Cocher « Dates confirmées » quand elles le sont.
3. **Comptes** : créer les comptes du comité, de la billetterie et des médias. Le mot de passe provisoire se remet en main propre ; chacun le change depuis son tableau de bord.
4. **Clubs et matchs** : saisir les clubs, puis le calendrier. Pendant un match, mettre le statut « en cours » et le score ; à la fin, « terminé », puis cocher « Résultat validé » pour que le classement se mette à jour.
5. **Billetterie** : créer les catégories (prix, places par match) et cocher « En vente ».

## Développement

```bash
npm install
cp .env.example .env.local   # puis renseigner les valeurs
npm run dev                  # http://localhost:3000
npm test                     # tests unitaires
npm run lint                 # vérification des types
npm run build
```

Sans variables Supabase, le site s'affiche quand même avec des listes vides, ce qui permet de vérifier la mise en page.

## Prochaines étapes

- Paiement mobile money (Orange Money, MTN MoMo, Moov Money, Wave) via CinetPay et e-billet avec QR code : nécessite un compte marchand CinetPay au nom du comité.
- Lecture du QR code à la caméra pour le contrôle à l'entrée.
- Envoi automatique des alertes WhatsApp (WhatsApp Business).
- Envoi des photos directement depuis l'espace médias (aujourd'hui : lien vers l'image).

Les informations non encore décidées par le comité (dates définitives, barème, format de la phase finale, contacts) sont affichées « à confirmer » sur le site.
