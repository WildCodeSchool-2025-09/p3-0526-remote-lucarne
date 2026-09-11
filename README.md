# Lucarne

Lucarne est une application web organisée en monorepo npm et TypeScript. Elle
regroupe une application React/Vite, une API Express, une base PostgreSQL et des
packages partagés, pilotés depuis la racine du dépôt.

## Prérequis

- Node.js 24 (version commune à `.nvmrc`, Docker et la CI) ;
- npm 10 ou une version ultérieure ;
- Docker Desktop avec Docker Compose (méthode recommandée), ou PostgreSQL 17 pour
  une installation entièrement locale.

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

   Remplacer également `APP_SECRET` du modèle par un secret local d'au moins
   32 caractères. Ne jamais commiter le fichier `.env`.

   ```env
   APP_PORT=3310
   DATABASE_URL=postgresql://user:password@localhost:5435/lucarne
   TEST_DATABASE_URL=postgresql://test_user:test_password@localhost:5436/lucarne_test
   CLIENT_URL=http://localhost:3000
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

   Le seed utilise Prisma et Faker. Il crée une ligue, une saison active,
   deux équipes, deux participations, 24 joueuses (12 par équipe) et deux
   entraîneurs (un par équipe).

   Les UUID stables et la graine Faker rendent les données reproductibles
   et évitent les doublons. Chaque exécution remet toutefois les données de
   démonstration à leurs valeurs initiales, notamment les points, les rangs
   et les statuts des participations. Réserver cette commande aux bases de
   développement ou de test : elle refuse `NODE_ENV=production`.

   L'orchestrateur `apps/api/bin/seed.ts` appelle les modules de
   `apps/api/database/seeders/` dans une transaction unique. Le fichier
   `database/seed.sql` n'est plus utilisé.

## Communication entre le front-end et l'API

Le front-end lit l'URL de l'API depuis `VITE_API_URL`. En développement local,
`apps/web/.env` doit contenir :

```env
VITE_API_URL=http://localhost:3310
```

L'API lit l'origine autorisée par CORS depuis `CLIENT_URL`. Pour autoriser le
front-end local, `apps/api/.env` doit contenir :

```env
CLIENT_URL=http://localhost:3000
```

Seules les variables préfixées par `VITE_` sont intégrées au code exécuté dans
le navigateur. Les secrets serveur, notamment `APP_SECRET` et `DATABASE_URL`,
ne doivent jamais être ajoutés à l'environnement Vite ni importés par le
front-end.

Le module `apps/web/src/lib/httpClient.ts` centralise les appels HTTP. Il
combine automatiquement `VITE_API_URL`, le préfixe partagé `/api/v1` et le
chemin de la ressource. Les composants utilisent donc uniquement un chemin
relatif à l'API versionnée :

```ts
import type { HealthResponse } from "@lucarne/shared";
import { httpClient } from "./lib/httpClient";

const health = await httpClient.get<HealthResponse>("/health");
```

En local, cet appel cible
`http://localhost:3310/api/v1/health`. Le client prend également en charge les
corps JSON, les paramètres de requête, les réponses sans contenu et le format
d'erreur commun de l'API via `HttpError`.

La page d'accueil temporaire exécute cet appel avec React Query et affiche un
état distinct pendant le chargement, lorsque l'API répond et lorsqu'elle est
indisponible. Les options communes de React Query se trouvent dans
`apps/web/src/lib/queryClient.ts`.

Pour vérifier manuellement la communication, démarrer les deux applications :

```bash
npm run dev
```

Ouvrir ensuite <http://localhost:3000>. La page doit afficher
`État de l'API : ok`. La route peut aussi être contrôlée directement :

```bash
curl http://localhost:3310/api/v1/health
```

La réponse attendue est `{"status":"ok"}`.

## Prisma et migrations

Le schéma Prisma se trouve dans `apps/api/prisma/schema.prisma` et sa
configuration dans `apps/api/prisma7.config.ts`. Les modèles Prisma suivent le
`PascalCase` et leurs propriétés le `camelCase`. Les attributs `@@map` et `@map`
conservent les tables et colonnes PostgreSQL en `snake_case`.

L'instance partagée de `PrismaClient` est exportée par
`apps/api/database/prisma.ts`. Les fonctionnalités de l'API doivent importer ce
module au lieu de créer une nouvelle instance à chaque utilisation.

La migration `apps/api/prisma/migrations/0_init/migration.sql` constitue la
baseline de la base. Elle contient également les extensions PostgreSQL, les
contraintes `CHECK`, les index partiels et les triggers qui ne sont pas tous
représentables dans le schéma Prisma. Une migration déjà appliquée ne doit pas
être modifiée.

Pour faire évoluer la base en développement :

1. Modifier `apps/api/prisma/schema.prisma`.
2. Valider le schéma et créer une migration nommée.
3. Vérifier le fichier `migration.sql` généré et y ajouter, si nécessaire, le
   SQL des contraintes ou triggers non pris en charge par Prisma.
4. Régénérer Prisma Client.

```bash
npm run prisma:validate
npm exec --workspace=@lucarne/api -- prisma migrate dev --name <nom-migration>
npm run prisma:generate
```

Sur un environnement déployé, `npm run db:migrate` applique uniquement les
migrations versionnées qui sont encore en attente. Le client généré dans
`apps/api/src/generated/prisma` est reproductible avec
`npm run prisma:generate` et n'est pas versionné.

Pour une base créée avec l'ancien script SQL avant l'ajout de Prisma Migrate,
enregistrer une seule fois la baseline sans réexécuter son SQL :

```bash
npm exec --workspace=@lucarne/api -- prisma migrate resolve --applied 0_init
```

Cette commande ne doit être utilisée que si les tables de la migration
`0_init` existent déjà dans la base ciblée.

## Base de données de test

Le profil Compose `test` démarre une instance PostgreSQL séparée nommée
`db_test`. Elle utilise la base `lucarne_test`, le port local `5436` et le volume
nommé `postgres_test_data`. Utiliser exclusivement cette base dédiée pour
les tests d'intégration : leur préparation vide les tables applicatives,
tout en conservant `_prisma_migrations`.

Pour démarrer et contrôler la base de test :

```bash
docker compose --profile test up -d db_test
docker compose --profile test ps db_test
```

Dans PowerShell, appliquer les migrations Prisma à la base de test puis exécuter
les tests :

```powershell
$previousDatabaseUrl = $env:DATABASE_URL
try {
  $env:DATABASE_URL = "postgresql://test_user:test_password@localhost:5436/lucarne_test"
  npm run db:migrate
  if ($LASTEXITCODE -ne 0) { throw "Test database migration failed" }
} finally {
  if ($null -eq $previousDatabaseUrl) {
    Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
  } else {
    $env:DATABASE_URL = $previousDatabaseUrl
  }
}
npm run test:api:integration
```

Prisma CLI utilise `DATABASE_URL` pour les migrations. Les tests utilisent
`TEST_DATABASE_URL`, définie par défaut dans `apps/api/vitest.setup.ts`.
Ces deux URL doivent être distinctes lors de l'exécution des tests. Si les
identifiants ou le port Docker sont personnalisés, adapter l'URL de migration
et `TEST_DATABASE_URL` avant de lancer les tests.

Lorsque les tests sont terminés, arrêter l'instance dédiée sans supprimer son
volume :

```bash
docker compose --profile test stop db_test
```

## Tests de l'API

Les tests de l'API utilisent Vitest et Supertest. Le fichier
`apps/api/vitest.setup.ts` charge automatiquement l'environnement de test avant
l'import de l'application, notamment `NODE_ENV=test` et l'URL de la base
PostgreSQL dédiée.

Les tests HTTP actuels vérifient la route de santé et le format commun des
erreurs `404` sans exécuter `server.ts` ni accéder à la base de données.
Supertest utilise l'application Express importée et peut ouvrir un port
éphémère pendant une requête :

```bash
npm run test:api
npm run test:api:coverage
```

La commande suivante exécute les tests classiques de tous les workspaces ;
elle exclut les tests d'intégration PostgreSQL :

```bash
npm test
```

L'instance `db_test` et l'application préalable du schéma sont requises pour les
tests qui accèdent à PostgreSQL. Ces tests sont isolés dans les fichiers
`*.integration.test.ts` et se lancent avec :

```bash
npm run test:api:integration
```

## Commandes utiles

| Commande | Description |
| --- | --- |
| `npm run dev` | Lance `@lucarne/web` et `@lucarne/api` en développement |
| `npm run dev:web` | Lance uniquement l'application web |
| `npm run dev:api` | Lance uniquement l'API |
| `npm run db:migrate` | Déploie les migrations Prisma en attente |
| `npm run db:seed` | Génère les données de démonstration avec Prisma et Faker |
| `npm run prisma:generate` | Génère Prisma Client à partir du schéma |
| `npm run prisma:validate` | Valide le schéma Prisma |
| `npm run prisma:migrate` | Crée et applique une migration en développement |
| `npm run prisma:deploy` | Déploie les migrations Prisma en attente |
| `npm run prisma:studio` | Ouvre Prisma Studio |
| `npm run check` | Exécute ESLint et la vérification TypeScript |
| `npm run check:fix` | Corrige les erreurs ESLint automatisables |
| `npm run check-types` | Vérifie les types de tous les workspaces concernés |
| `npm run lint` | Vérifie le code avec ESLint |
| `npm test` | Exécute les tests |
| `npm run test:api` | Exécute les tests unitaires et HTTP de l'API |
| `npm run test:api:watch` | Relance les tests API à chaque modification |
| `npm run test:api:coverage` | Exécute les tests API avec la couverture |
| `npm run test:api:integration` | Exécute les tests API avec PostgreSQL |
| `npm run build` | Vérifie l'API et construit l'application Vite |
| `npm start` | Démarre l'API |

## Organisation

```text
apps/
├── api/                       API Express et accès PostgreSQL avec Prisma
│   ├── database/
│   │   ├── client.ts          Pool PostgreSQL partagé
│   │   ├── prisma.ts          Instance Prisma Client centralisée
│   │   └── seeders/           Seeders Prisma et données Faker
│   ├── prisma/
│   │   ├── migrations/        Historique versionné des migrations
│   │   └── schema.prisma      Modèles et relations Prisma
│   ├── prisma7.config.ts      Configuration de Prisma CLI
│   └── src/
│       ├── config/            Configuration de l'application
│       ├── errors/            Erreurs applicatives
│       ├── features/          Fonctionnalités regroupées par domaine
│       ├── generated/prisma/  Prisma Client généré et ignoré par Git
│       ├── middlewares/       Middlewares Express transversaux
│       ├── types/             Types propres à l'API
│       ├── app.test.ts        Tests HTTP de l'application avec Supertest
│       ├── app.ts             Création et configuration d'Express
│       ├── router.ts          Point d'entrée des routes versionnées
│       └── server.ts          Démarrage du serveur HTTP
└── web/                       Application React et Vite
    └── src/
        ├── config/            Validation de l'environnement Vite
        ├── lib/               Client HTTP et configuration React Query
        └── pages/             Pages de l'application
packages/
├── eslint-config/             Configuration ESLint partagée
├── shared/                    Types et utilitaires communs
└── typescript-config/         Configurations TypeScript partagées
```

### Architecture de l'API

En production, Express sert aussi les fichiers de `apps/web/dist` et renvoie
`index.html` pour les routes du portail. Les routes `/api` et les fichiers
inexistants conservent leurs réponses d'erreur. Le Compose de production
applique les migrations et construit le front-end avant de démarrer l'API.
Il dépend d'un réseau Traefik `proxy` et du fichier d'environnement externe
indiqué dans `docker-compose.prod.yml` ; leur configuration sur le VPS est
un prérequis au déploiement.

L'image Docker installe les dépendances depuis le lockfile et génère Prisma
Client. En développement Docker, cette génération est répétée au démarrage
car le montage du dépôt remplace les sources de l'image.

La CI vérifie lint, types, build, tests web/API et intégration PostgreSQL
pour les PR ciblant `dev`, `develop` ou `main`.

La création de l'application Express est séparée du démarrage du serveur HTTP.
Le fichier `apps/api/src/app.ts` configure les middlewares et les routes, puis
exporte l'application sans ouvrir de port. Le fichier `apps/api/src/server.ts`
charge l'environnement, vérifie la connexion à la base de données et démarre
le serveur. Cette séparation permet notamment d'importer l'application dans les
tests sans lancer de serveur HTTP.

Les routes de l'API utilisent le préfixe `/api/v1`. Une route de santé permet de
vérifier son fonctionnement :

```http
GET /api/v1/health
```

Elle renvoie une réponse `200 OK` :

```json
{
  "status": "ok"
}
```

Les routes inconnues et les erreurs applicatives utilisent le format commun :

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Resource not found"
  }
}
```

### Package partagé

Le workspace `@lucarne/shared` centralise les contrats utilisés par le web et
l'API. Il contient les constantes communes, les schémas de validation Zod et
les types TypeScript associés :

```text
packages/shared/src/
├── constants/                Chemins API et valeurs de pagination
├── schemas/                  Schémas de validation Zod
├── types/                    Contrats API et types de pagination
├── utils/                    Futurs utilitaires purs
└── index.ts                  Point d'entrée principal
```

Les premiers exports comprennent le préfixe `/api/v1`, les valeurs de
pagination, le schéma `paginationQuerySchema`, `HealthResponse`, les réponses
d'erreur API et les réponses paginées génériques. Ils sont accessibles depuis
la racine ou depuis des points d'entrée spécialisés :

```ts
import { API_V1_PATH } from "@lucarne/shared";
import { DEFAULT_LIMIT } from "@lucarne/shared/constants";
import { paginationQuerySchema } from "@lucarne/shared/schemas";
import type { ApiErrorResponse, HealthResponse } from "@lucarne/shared/types";
```

Un schéma partagé doit rester indépendant du web et de l'API afin que les deux
applications appliquent les mêmes règles de validation. Son type TypeScript est
dérivé avec `z.infer` lorsqu'il représente les données validées par ce schéma.

Pour une route de liste, `paginationQuerySchema` normalise `page`, `limit`,
`search` et `sort`. Le tri utilise un nom de champ `camelCase`, préfixé par `-`
pour l'ordre décroissant. Chaque feature étend ce schéma avec ses propres
filtres et utilise `createSortQuerySchema` pour limiter les champs de tri
autorisés avant de construire la requête Prisma.

Dans l'API, `validateRequest` valide et remplace `body`, `params` et `query` par
les valeurs parsées par Zod. Les contrôleurs asynchrones sont enveloppés avec
`asyncHandler` afin que leurs rejets atteignent le middleware d'erreur sous
Express 4. Le middleware central convertit les erreurs Zod et les principales
erreurs Prisma vers le format d'erreur commun. Les erreurs de validation peuvent
inclure une liste `details` contenant uniquement le chemin et le message des
champs invalides, sans exposer les données reçues ni les détails internes.

Le manifeste racine déclare les workspaces `apps/*` et `packages/*`. Les
applications sont nommées `@lucarne/web` et `@lucarne/api`. Elles dépendent
toutes les deux de `@lucarne/shared`, dont les exports initiaux sont disponibles
depuis la racine du package, `@lucarne/shared/constants`,
`@lucarne/shared/schemas`, `@lucarne/shared/types` et
`@lucarne/shared/utils`.

Toutes les commandes npm doivent être exécutées depuis la racine. Le dépôt
conserve un unique `package-lock.json` à cet emplacement.

ESLint assure le lint, les règles de style du code source, les contrôles
TypeScript sémantiques et les règles propres à React. Le plugin ESLint
`@stylistic` contrôle notamment l'indentation, les guillemets, les espaces, les
points-virgules et les virgules finales. Aucun formateur séparé n'est utilisé.

Les corrections de style automatisables peuvent être appliquées avec :

```bash
npm run lint:fix
```

Les noms de branches doivent rester compatibles avec Git. Par exemple :

```bash
git switch -c INIT-001/initialize-github
```
