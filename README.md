# Lucarne

Lucarne est une application web en monorepo TypeScript, composée d'un client
React/Vite, d'une API Express et d'une base de données MySQL.

## Prérequis

- Node.js 20 ou une version ultérieure ;
- npm ;
- Docker Desktop avec Docker Compose (méthode recommandée), ou MySQL 8 pour
  une installation entièrement locale.

## Initialisation avec Docker

```bash
git clone <url-du-depot>
cd p3-0526-remote-lucarne
docker compose up -d --build
docker compose exec web npm run db:migrate
```

Docker lance MySQL, le client et l'API. La commande de migration crée la base,
ses tables et les données de démonstration. L'application est ensuite
accessible aux adresses suivantes :

- client : <http://localhost:3000> ;
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
   cp server/.env.sample server/.env
   cp client/.env.sample client/.env
   ```

3. Renseigner dans `server/.env` un compte MySQL autorisé à créer une base,
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

4. Initialiser les tables et les données de démonstration, puis démarrer le
   projet :

   ```bash
   npm run db:migrate
   npm run dev
   ```

## Commandes utiles

| Commande | Description |
| --- | --- |
| `npm run dev` | Lance le client et l'API en développement |
| `npm run db:migrate` | Applique le schéma SQL |
| `npm run db:seed` | Charge les jeux de données |
| `npm run check` | Vérifie le formatage et les types |
| `npm test` | Exécute les tests |
| `npm run build` | Construit le projet |

## Organisation

```text
client/   Application React et Vite
server/   API Express, accès MySQL, migrations et tests
```

Les noms de branches doivent rester compatibles avec Git. Par exemple :

```bash
git switch -c init-001-initialization-github
```
