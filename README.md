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
└── web/                       Application React et Vite
packages/
├── eslint-config/             Configuration ESLint partagée
├── shared/                    Types et utilitaires communs
└── typescript-config/         Configurations TypeScript partagées
```

Le manifeste racine déclare les workspaces `apps/*` et `packages/*`. Les
applications sont nommées `@lucarne/web` et `@lucarne/api`. Elles dépendent
toutes les deux de `@lucarne/shared`, dont les exports initiaux sont disponibles
depuis la racine du package, `@lucarne/shared/types` et
`@lucarne/shared/utils`.

Toutes les commandes npm doivent être exécutées depuis la racine. Le dépôt
conserve un unique `package-lock.json` à cet emplacement.

ESLint assure le lint, les règles de style du code source, les contrôles
TypeScript sémantiques et les règles propres à React.

Les noms de branches doivent rester compatibles avec Git. Par exemple :

```bash
git switch -c init-001-initialization-github
```
