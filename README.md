# Lucarne

Lucarne permet de gérer des ligues, équipes, joueuses et membres du staff de football. Ce monorepo
npm/TypeScript regroupe React 19, Vite 6, React Router 7, TanStack Query, React Hook
Form et Tailwind 4 côté Web ; Express 4, Prisma 7, Zod 4 et PostgreSQL côté API.
Les packages partagés et les applications sont pilotés depuis la racine.

## Fonctionnalités et utilisation

- Dashboard avec listes, recherche, filtres, tri et pagination des ligues,
  équipes, joueuses, membres du staff, saisons et matchs ; présentation en tableaux ou cartes
  selon la largeur de l'écran.
- Création, consultation, modification, activation/désactivation et suppression
  sous conditions de dépendances et de droits. La création d'une ligue ne crée
  ni saison ni participation ; elle est inactive par défaut.
- Affectations des joueuses et du staff aux équipes : affectation initiale
  facultative, planification, équipe courante et historique conservé. Les dates
  d'affectation sont des dates civiles inclusives ; aujourd'hui est calculé en
  Europe/Paris. Désactiver une joueuse conserve toutes ses périodes ; désactiver
  le staff clôt son affectation courante la veille, sous contrôle de cohérence.
- Contrôle de version pour les modifications des ligues, joueuses et membres du
  staff, saisons et matchs : une modification devenue obsolète reçoit un conflit HTTP 409.
- Saisons globales réutilisées par plusieurs ligues via `LeagueSeason` ; gestion
  des participations par édition et génération atomique des journées et emplacements.
- Programmation, publication, états et résultats des matchs administrés par ADMIN ;
  calendrier public `/matches`, limité aux matchs actifs et publiés. La suppression
  d'un match conserve ses résultats et événements, et libère ses réservations.
- Authentification API par mot de passe et jeton Bearer ; droits contrôlés côté
  serveur avec relecture du compte et de son rôle à chaque requête protégée.

Après installation et chargement du seed facultatif, ouvrir
<http://localhost:3000/dev/login> en développement et utiliser le compte
`admin@lucarne.test` avec le mot de passe choisi dans `DEMO_ADMIN_PASSWORD`.
La page donne accès à `/dashboard/leagues`, `/dashboard/teams`,
`/dashboard/players`, `/dashboard/staff-members`, `/dashboard/seasons` et
`/dashboard/matches`. Sans seed, un compte actif
doit déjà exister dans la base ; aucune inscription n'est implémentée.

Les rôles `ADMIN`, `MODERATOR` et `EDITOR` accèdent au dashboard et aux opérations
d'écriture autorisées par les routes. Les suppressions définitives sont réservées
à `ADMIN`. Le rôle `USER` n'accède pas aux ressources métier du dashboard.
Les contrôles d'interface ne remplacent pas les permissions de l'API.

La connexion `/dev/login` est absente du build de production : il n'existe pas
encore de parcours Web de connexion en production. `/ui-demo` présente les
composants UI et reste accessible dans le routeur actuel.

## Architecture et structure

```text
apps/api/                   API Express, Prisma, migrations et tests PostgreSQL
apps/web/                   Interface React/Vite, services HTTP et tests jsdom
packages/shared/            Schémas Zod, types HTTP et constantes
packages/eslint-config/     Configuration ESLint commune
packages/typescript-config/ Configuration TypeScript commune
docs/                       Cadrage et documentation locale
.github/workflows/          Validation et déploiement staging
```

Un parcours suit les couches page → hook TanStack Query → service HTTP Web →
route/contrôleur Express → service métier → repository → Prisma/PostgreSQL.
`@lucarne/shared` exporte du TypeScript source, sans build séparé. L'API utilise
le préfixe `/api/v1` et un format commun d'erreur
`{ "error": { "code": "...", "message": "..." } }`.

Les pages administratives utilisent `/dashboard/...` et des UUID internes.
Les matchs publics utilisent un `matchPublicId` UUID distinct et immuable.
Les événements existent dans le modèle, sans parcours de gestion dédié.

## Prérequis

- Node.js 24 (version commune à `.nvmrc`, Docker et la CI) ;
- npm 10 ou une version ultérieure ;
- Docker Desktop avec Docker Compose (méthode recommandée), ou PostgreSQL 17 pour
  une installation entièrement locale.

Les deux PNG importés par le dashboard résident dans `apps/web/docs/images`.
Les règles Git incluent ces deux fichiers précisément ; les autres documents
locaux de ce répertoire restent ignorés. Les assets doivent faire partie du
commit livré, comme les sources, pour être présents dans un clone.

## Initialisation avec Docker

```bash
git clone <url-du-depot>
cd lucarne
cp .env.example .env
docker compose up -d --build
docker compose exec web npm run db:migrate
```

Le fichier `.env` permet de configurer `DB_NAME`, `DB_USER`, `DB_PASSWORD` et
`POSTGRES_PORT` pour l'environnement local. Docker lance PostgreSQL,
l'application web et l'API. La commande de migration applique les migrations
Prisma qui n'ont pas encore été exécutées. L'application est ensuite accessible
aux adresses suivantes :

- application web : <http://localhost:3000> ;
- API : <http://localhost:3310>.

Le service Compose nommé `web` exécute à la fois Vite et Express. Le seed n'est
pas lancé automatiquement. Pour créer le compte de démonstration avec Docker,
fournir `DEMO_ADMIN_PASSWORD` à la commande :

```bash
docker compose exec -e DEMO_ADMIN_PASSWORD web npm run db:seed
```

Cette variable doit être définie dans l'environnement du terminal appelant.
Le secret JWT fixé dans Compose est destiné au développement local.

## Gestion de l'environnement Docker

Pour démarrer uniquement PostgreSQL, vérifier son état, puis démarrer ou
reconstruire l'ensemble des services :

```bash
docker compose up -d db
docker compose ps
docker compose up -d --build
```

Pour arrêter les services sans supprimer les données PostgreSQL :

```bash
docker compose down
```

Pour réinitialiser complètement l'environnement et la base de données, supprimer
le volume, redémarrer les services puis appliquer le schéma :

> **Attention :** `docker compose down -v` supprime définitivement toutes les
> données PostgreSQL stockées dans le volume local.

```bash
docker compose down -v
docker compose up -d --build
docker compose exec web npm run db:migrate
```

## Initialisation locale

1. Installer les dépendances à la racine :

   ```bash
   npm ci
   ```

2. Créer les fichiers d'environnement à partir des modèles :

   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.sample apps/web/.env
   ```

3. Renseigner dans `apps/api/.env` les URL PostgreSQL de développement et de
   test :

   Renseigner aussi `DEMO_ADMIN_PASSWORD` si le seed facultatif est utilisé.
   Remplacer également `APP_SECRET` du modèle par un secret local d'au moins
   32 caractères. Ne jamais commiter le fichier `.env`.

   ```env
   APP_PORT=3310
   DATABASE_URL=postgresql://user:password@localhost:5435/lucarne
   TEST_DATABASE_URL=postgresql://test_user:test_password@localhost:5436/lucarne_test
   CLIENT_URL=http://localhost:3000
   BUG_REPORTS_FILE_PATH=C:\\Users\\<user>\\.lucarne\\bug-reports.json
   ```

   Vérifier également que `VITE_API_URL` dans `apps/web/.env` contient une URL
   absolue valide (ou une chaîne vide pour utiliser une URL relative). Cette
   variable est validée au démarrage de l'application web.

4. Générer Prisma Client, appliquer les migrations, charger éventuellement les
   données de développement, puis démarrer le projet :

   ```bash
   npm run prisma:generate
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```

   Le seed crée uniquement le compte administrateur `admin@lucarne.test` et les
   rôles de référence nécessaires à l’application. Il ne crée aucune donnée métier.
   `npm run seed` et `npm run db:seed` vident d’abord toutes les données
   applicatives, comptes et associations inclus, puis recréent ce compte avec le
   mot de passe fourni par `DEMO_ADMIN_PASSWORD`. Le schéma et l’historique des
   migrations sont conservés.
   Le reset et le chargement sont atomiques : un échec restaure les données
   précédentes. Ces commandes sont interdites en production. Lire
   [le modèle de données](apps/api/docs/DATA_MODEL.md#seeds) avant de les lancer.

## Communication et environnement

Les modèles existants sont [.env.example](.env.example) pour Compose,
[apps/api/.env.example](apps/api/.env.example) pour l'API et
[apps/web/.env.sample](apps/web/.env.sample) pour Vite. Ne pas versionner les .env réels.

Le Web utilise VITE_API_URL (localement http://localhost:3310) ; une valeur vide
utilise la même origine, notamment en production. Le
[validateur Web](apps/web/src/config/environment.ts) exige une URL absolue ou vide.
Le [client HTTP](apps/web/src/lib/httpClient.ts) ajoute /api/v1 et le chemin de
ressource. L'API autorise l'origine locale http://localhost:3000 via CLIENT_URL,
validée avec les paramètres serveur dans [environment.ts](apps/api/src/config/environment.ts).

Seules les variables préfixées VITE_ sont exposées dans le bundle navigateur.
APP_SECRET, DATABASE_URL et les autres secrets restent côté serveur ; le Web
n'a pas de couche serveur propre. La valeur VITE_API_URL est intégrée au build.

| Variable API | Usage / valeur par défaut |
| --- | --- |
| `NODE_ENV` | `development`, `test` ou `production` ; défaut `development` |
| `APP_PORT` | Port HTTP ; défaut `3310` |
| `APP_SECRET` | Secret JWT obligatoire, au moins 32 caractères |
| `DATABASE_URL` | URL PostgreSQL obligatoire |
| `TEST_DATABASE_URL` | Obligatoire en mode test ; base dédiée au préfixe `lucarne_test`, distincte de la base de développement |
| `CLIENT_URL` | Origine CORS autorisée ; facultative, vide en production de même origine |
| `BUG_REPORTS_FILE_PATH` | Chemin absolu du fichier de bug reports de développement ; par défaut `~/.lucarne/bug-reports.json` ; ne jamais le placer dans le dépôt |
| `UPLOAD_DIRECTORY` | Répertoire absolu des images téléversées ; défaut `~/.lucarne/upload`. Prévoir un stockage persistant ; les configurations Compose le placent dans un volume |
| `JWT_ACCESS_TOKEN_TTL_SECONDS` | Durée du jeton ; défaut `900`, maximum `86400` secondes |
| `LOGIN_RATE_LIMIT_MAX_ATTEMPTS` | Tentatives par couple IP/email ; défaut `5`, `0` désactive la limite |
| `LOGIN_RATE_LIMIT_WINDOW_MS` | Fenêtre de limitation ; défaut `60000` millisecondes |
| `DEMO_ADMIN_PASSWORD` | Mot de passe du compte de démonstration, utilisé uniquement par le seed |

Le limiteur conserve au plus 10 000 compteurs IP/email à clés hachées de taille
fixe. Chaque requête évince les entrées expirées. À capacité pleine, une nouvelle
clé reçoit 429 avec `Retry-After` ; les compteurs actifs sont conservés pour
éviter qu'un afflux de clés réinitialise les tentatives bloquées. La limitation
reste locale au processus ; aucun nouvel arbitrage par IP seule ni configuration
de proxys de confiance n'est ajouté. `LOGIN_RATE_LIMIT_MAX_ATTEMPTS=0` la désactive.

Un changement de jeton ou une déconnexion vide les caches Query/Mutation et annule
les requêtes HTTP en cours. Une révision de session empêche aussi leurs réponses
tardives d'être rendues au compte suivant, même si le transport ignore l'annulation.
Une tentative de connexion échouée ne remplace pas la session existante.

Les formulaires de création et de modification des joueuses, du staff, des équipes
et des ligues utilisent le composant commun `ImagePicker` pour choisir une photo ou
un logo JPEG, PNG ou WebP de 5 Mo maximum. Le fichier est envoyé à l'enregistrement ;
son URL est ensuite sauvegardée dans `pictureUrl` ou `logoUrl`.
Le téléversement authentifié `POST /api/v1/uploads/photos` reçoit le fichier binaire ;
l'API contrôle sa taille et sa signature de format, puis attribue un nom UUID.
La lecture `GET /api/v1/uploads/photos/:photoId` sert l'image sans jeton.
L'ancienne lecture `GET /api/v1/players/photos/:photoId` est conservée pour les URL
permanentes déjà enregistrées. L'ancienne route d'envoi `POST /api/v1/players/photos`
a été supprimée. Les images restent sur le disque de l'API : sauvegarder le
répertoire ou volume correspondant. Les volumes Compose existants conservent leur
nom et leur chemin de stockage.

Après démarrage, la page d'accueil affiche l'état de santé et ses états
chargement/erreur. Vérification manuelle :

```bash
curl http://localhost:3310/api/v1/health
```

Réponse attendue : 200 et `{"status":"ok"}`.
Ce contrôle de santé ne vérifie pas la disponibilité de PostgreSQL.

## Commandes principales

Depuis la racine, Node.js 24 et npm >= 10 ; sous PowerShell, remplacer npm par
npm.cmd si npm.ps1 est bloqué. Un unique package-lock.json couvre les workspaces.
Les [scripts racine](package.json) définissent les commandes disponibles.

| Commande | Périmètre |
| --- | --- |
| `npm run dev` | API et Web ; dev:api / dev:web pour une seule partie |
| `npm run check` | ESLint et types de shared/API/Web |
| `npm run lint` | ESLint seul, sans modification de fichiers |
| `npm run check-types` | Vérification TypeScript de shared/API/Web |
| `npm run lint:fix` | Corrections ESLint automatisables ; aucun formateur séparé |
| `npm run test:shared` | Schémas et contrats partagés |
| `npm run test:api` | Unitaires/HTTP API sans base |
| `npm run test:web` | Tests Web, HTTP simulé |
| `npm test` | Shared, API unitaires/HTTP, puis Web |
| `npm run test:integration` | API avec PostgreSQL dédié ; alias test:api:integration |
| `npm run build` | Vérifie les types API, puis les types Web et produit `apps/web/dist` ; aucun JavaScript API n'est émis |
| `npm start` | Démarre l'API avec tsx |
| `npm run validate` | Lint, types, tests shared/API/Web, intégration PostgreSQL, build |
| `npm run prisma:validate` | Validation du schéma Prisma |
| `npm run test:api:coverage` / `npm run test:web:coverage` | Couverture des suites API unitaires / Web |

validate s'arrête au premier échec ; il ne démarre pas Docker et n'applique pas
les migrations. Choisir les vérifications utiles au changement. Les configurations
ESLint et TypeScript incluent sources et tests ; aucune étape ne doit masquer ses erreurs.

### Tests avec PostgreSQL

La commande `npm test` ne lance pas les intégrations PostgreSQL. Démarrer la base
dédiée et vérifier son état :

```bash
docker compose --profile test up -d db_test
docker compose --profile test ps db_test
```

Appliquer ensuite les migrations avec `DATABASE_URL` pointant temporairement
vers cette base de test, puis restaurer sa valeur avant de lancer
`npm run test:integration`. La procédure PowerShell complète figure dans les
[tests API](apps/api/docs/TESTING.md#base-de-données-de-test).
Les tests vident les tables applicatives de cette base avant chaque cas et
préservent `_prisma_migrations`. Ne jamais les diriger vers des données à conserver.

Les tests Web utilisent jsdom et des appels HTTP simulés, y compris ceux nommés
« intégration ». Aucun test navigateur de bout en bout n'est configuré.

## Production et CI

En production, Express sert aussi `apps/web/dist` et le fallback des routes SPA.
`npm start` démarre uniquement Express via `tsx` : construire le Web au préalable.
`docker-compose.prod.yml` applique les migrations, construit puis démarre l'API.
Il dépend d'un réseau Traefik externe `proxy` et d'un fichier d'environnement
externe ; ce n'est pas une configuration autonome de production.

Le workflow CI cible les pull requests vers `develop`, `dev`, `main`, `staging`
et les push sur `staging`. Le déploiement staging attend sa réussite et transmet
le SHA validé à un script VPS externe, absent du dépôt. Voir
[le workflow de validation](.github/workflows/check.yml) et
[le workflow de déploiement](.github/workflows/deploy-traefik.yml).

## Limitations confirmées

État actuel vérifié lors des corrections de l'audit du 6 octobre 2026.
L'[audit initial](AUDIT-2026-10-06.md) décrit un état antérieur ; le
[bilan des corrections](AUDIT-2026-10-06-CORRECTIONS.md) distingue les vérifications
locales, en export propre et les limites concernant la CI réelle.

- **Documentation locale :** les documents sous `docs`, `apps/api/docs` et `apps/web/docs` ainsi que
  les fichiers `AGENTS.md` sont également locaux et absents de l'index Git ; les
  liens vers ces documents supposent leur présence dans l'espace de travail.
- **Migration du staff :** la migration `20260914110000_staff_member_crud`
  impose une nationalité non nulle sans reprise des anciennes valeurs nulles.
  Une base contenant ces valeurs nécessite une décision de reprise des données
  avant cette migration ; aucune nationalité ne doit être inventée.
- **Connexion :** aucun parcours Web de connexion en production ni mécanisme de
  renouvellement du jeton n'est implémenté. Le limiteur borné reste local à
  chaque processus ; une stratégie multi-instance et par IP seule reste à décider.
- **Images externes :** la CSP actuelle autorise seulement la même origine et
  `data:` pour les images, malgré les URLs externes acceptées par les formulaires.
  Les origines HTTPS autorisées restent à définir avant de modifier cette politique.
- **Exploitation :** quotas/rétention des photos locales, limites opérationnelles
  de génération de calendriers et readiness PostgreSQL restent à préciser.
- **Accessibilité :** `AlertModal` ne gère pas le placement, le confinement ni
  la restitution du focus. Une vérification clavier en navigateur reste nécessaire.

Lors de l'audit historique du 15 septembre 2026, `npm test` avait réussi (137 tests shared, 121 API unitaires/HTTP,
172 Web), ainsi que les 139 tests PostgreSQL, les types et la validation Prisma.
Le build local a réussi avec un avertissement de bundle principal supérieur à
500 kB et deux avertissements Rollup sur des annotations de Zod. Ce résultat
local ne valide pas un clone propre ni un déploiement.

## Contribution

Lire les consignes communes et celles du domaine avant de modifier le projet.
Les changements de contrat doivent coordonner `packages/shared`, l'API, les
consommateurs Web et leurs tests. Respecter les modifications locales existantes
et rapporter les commandes de vérification réellement exécutées.

Les consignes locales prescrivent `XXXX-000/initialize-branch` pour les branches
et `XXXX-000/initialize-commit-work` pour les commits. L'outillage actuel n'impose
pas ces formats : le validateur de branche accepte tout, commitlint étend
Conventional Commits et aucun hook Git versionné ne les exécute. Leur alignement
reste une décision à prendre.

`npm run clean` supprime les dépendances installées **et le lockfile racine** ;
ce n'est pas une simple suppression d'artefacts de build. Ne pas l'utiliser pour
une vérification ou une installation reproductible avec `npm ci`.

## Documentation à consulter selon la tâche

- [AGENTS commun](AGENTS.md), [API](apps/api/AGENTS.md), [Web](apps/web/AGENTS.md) : consignes d'implémentation.
- [Architecture commune](docs/ARCHITECTURE.md) : carte, frontières et contrats partagés.
- [Données et migrations](apps/api/docs/DATA_MODEL.md) : schéma, contraintes, seeds et commandes Prisma.
- [Tests API](apps/api/docs/TESTING.md) : tests ciblés et préparation de la base dédiée.
- [Tests Web](apps/web/docs/TESTING.md) : composants, services et parcours simulés.
- [CI/CD](.github/CI.md) : pipeline et prérequis de déploiement ; workflows comme référence exécutable.
- [Fiche de fonctionnalité](docs/features/_template.md) : cadrer un besoin ; [décisions](docs/decisions/README.md) : consigner un choix technique.
