# Lucarne

Lucarne est une application web organisée en monorepo npm et TypeScript. Elle
regroupe une application React/Vite, une API Express, une base MySQL et des
packages partagés, pilotés depuis la racine du dépôt.

## Prérequis

- Node.js 20 ou une version ultérieure ;
- npm ;
- Docker Desktop avec Docker Compose (méthode recommandée), ou MySQL 8 pour
  une installation entièrement locale.

## Initialisation avec Docker

```bash
git clone <url-du-depot>
cd lucarne
docker compose up -d --build
docker compose exec web npm run db:migrate
```

Docker lance MySQL, l'application web et l'API. La commande de migration crée
la base et applique son schéma. L'application est ensuite accessible aux
adresses suivantes :

- application web : <http://localhost:3000> ;
- API : <http://localhost:3310>.

Pour arrêter les services :

```bash
docker compose down
```

## Initialisation locale

1. Installer les dépendances à la racine :

   ```bash
   npm install
   ```

2. Créer les fichiers d'environnement à partir des modèles :

   ```bash
   cp apps/api/.env.sample apps/api/.env
   cp apps/web/.env.sample apps/web/.env
   ```

3. Renseigner dans `apps/api/.env` un compte MySQL autorisé à créer une base,
   ainsi que le nom de la base à initialiser :

   ```env
   APP_PORT=3310
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=<utilisateur>
   DB_PASSWORD=<mot-de-passe>
   DB_NAME=<nom-de-la-base>
   CLIENT_URL=http://localhost:3000
   ```

   Vérifier également que `VITE_API_URL` dans `apps/web/.env` contient une URL
   absolue valide (ou une chaîne vide pour utiliser une URL relative). Cette
   variable est validée au démarrage de l'application web.

4. Initialiser la base, charger éventuellement les données de développement,
   puis démarrer le projet :

   ```bash
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```

   Le seed n'exécute des requêtes que si `apps/api/database/seed.sql` contient
   des instructions SQL.

## Commandes utiles

| Commande | Description |
| --- | --- |
| `npm run dev` | Lance `@lucarne/web` et `@lucarne/api` en développement |
| `npm run dev:web` | Lance uniquement l'application web |
| `npm run dev:api` | Lance uniquement l'API |
| `npm run db:migrate` | Applique le schéma SQL |
| `npm run db:seed` | Exécute le seed SQL de l'API |
| `npm run check` | Exécute ESLint et la vérification TypeScript |
| `npm run check:fix` | Corrige les erreurs ESLint automatisables |
| `npm run check-types` | Vérifie les types de tous les workspaces concernés |
| `npm run lint` | Vérifie le code avec ESLint |
| `npm test` | Exécute les tests |
| `npm run build` | Vérifie l'API et construit l'application Vite |
| `npm start` | Démarre l'API |

## Organisation

```text
apps/
├── api/                       API Express, MySQL, migrations et seeds
│   └── src/
│       ├── config/            Configuration de l'application
│       ├── errors/            Erreurs applicatives
│       ├── features/          Fonctionnalités regroupées par domaine
│       ├── middlewares/       Middlewares Express transversaux
│       ├── types/             Types propres à l'API
│       ├── app.ts             Création et configuration d'Express
│       ├── router.ts          Point d'entrée des routes versionnées
│       └── server.ts          Démarrage du serveur HTTP
└── web/                       Application React et Vite
packages/
├── eslint-config/             Configuration ESLint partagée
├── shared/                    Types et utilitaires communs
└── typescript-config/         Configurations TypeScript partagées
```

### Architecture de l'API

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
pagination, le schéma `paginationQuerySchema`, les réponses d'erreur API et les
réponses paginées génériques. Ils sont accessibles depuis la racine ou depuis
des points d'entrée spécialisés :

```ts
import { API_V1_PATH } from "@lucarne/shared";
import { DEFAULT_LIMIT } from "@lucarne/shared/constants";
import { paginationQuerySchema } from "@lucarne/shared/schemas";
import type { ApiErrorResponse } from "@lucarne/shared/types";
```

Un schéma partagé doit rester indépendant du web et de l'API afin que les deux
applications appliquent les mêmes règles de validation. Son type TypeScript est
dérivé avec `z.infer` lorsqu'il représente les données validées par ce schéma.

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
