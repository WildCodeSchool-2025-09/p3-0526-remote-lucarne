# Lucarne

Lucarne permet de gérer des ligues, équipes et joueuses de football. Ce monorepo
npm/TypeScript regroupe React 19, Vite 6, React Router 7, TanStack Query, React Hook
Form et Tailwind 4 côté Web ; Express 4, Prisma 7, Zod 4 et PostgreSQL côté API.
Les packages partagés et les applications sont pilotés depuis la racine.

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

   Renseigner aussi `DEMO_ADMIN_PASSWORD` si le seed facultatif est utilisé.
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

   Le seed est réservé au développement/test et peut réinitialiser des valeurs de
   démonstration. Lire [le modèle de données](apps/api/docs/DATA_MODEL.md#seeds)
   avant de le relancer sur une base existante.

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

Après démarrage, la page d'accueil affiche l'état de santé et ses états
chargement/erreur. Vérification manuelle :

```bash
curl http://localhost:3310/api/v1/health
```

Réponse attendue : 200 et `{"status":"ok"}`.

## Commandes principales

Depuis la racine, Node.js 24 et npm >= 10 ; sous PowerShell, remplacer npm par
npm.cmd si npm.ps1 est bloqué. Un unique package-lock.json couvre les workspaces.
Les [scripts racine](package.json) définissent les commandes disponibles.

| Commande | Périmètre |
| --- | --- |
| `npm run dev` | API et Web ; dev:api / dev:web pour une seule partie |
| `npm run check` | ESLint et types de shared/API/Web |
| `npm run lint:fix` | Corrections ESLint automatisables ; aucun formateur séparé |
| `npm run test:shared` | Schémas et contrats partagés |
| `npm run test:api` | Unitaires/HTTP API sans base |
| `npm run test:web` | Tests Web, HTTP simulé |
| `npm test` | Shared, API unitaires/HTTP, puis Web |
| `npm run test:integration` | API avec PostgreSQL dédié ; alias test:api:integration |
| `npm run build` | Vérifie les types API puis compile et construit le Web |
| `npm start` | Démarre l'API avec tsx |
| `npm run validate` | Lint, types, tests shared/API/Web, intégration PostgreSQL, build |

validate s'arrête au premier échec ; il ne démarre pas Docker et n'applique pas
les migrations. Choisir les vérifications utiles au changement. Les configurations
ESLint et TypeScript incluent sources et tests ; aucune étape ne doit masquer ses erreurs.

## Documentation à consulter selon la tâche

- [AGENTS commun](AGENTS.md), [API](apps/api/AGENTS.md), [Web](apps/web/AGENTS.md) : consignes d'implémentation.
- [Architecture commune](docs/ARCHITECTURE.md) : carte, frontières et contrats partagés.
- [Données et migrations](apps/api/docs/DATA_MODEL.md) : schéma, contraintes, seeds et commandes Prisma.
- [Tests API](apps/api/docs/TESTING.md) : tests ciblés et préparation de la base dédiée.
- [Tests Web](apps/web/docs/TESTING.md) : composants, services et parcours simulés.
- [CI/CD](.github/CI.md) : pipeline et prérequis de déploiement ; workflows comme référence exécutable.
- [Fiche de fonctionnalité](docs/features/_template.md) : cadrer un besoin ; [décisions](docs/decisions/README.md) : consigner un choix technique.
