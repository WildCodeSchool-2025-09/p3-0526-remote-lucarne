# Lucarne — consignes communes

Monorepo npm/TypeScript de gestion de ligues, équipes et joueuses :
`apps/api` (Express/Prisma), `apps/web` (React/Vite), `packages/shared`
(contrats Zod/types), `packages/*-config` (outillage), `docs` (cadrage).

Avant de modifier une partie, lire son [AGENTS API](apps/api/AGENTS.md) ou
[AGENTS Web](apps/web/AGENTS.md) ; lire les deux pour une tâche transversale.
Ne charger que les documents utiles :

- [README](README.md) pour installer, lancer ou trouver une commande ;
- [architecture commune](docs/ARCHITECTURE.md) pour placer une fonctionnalité ou modifier un contrat partagé ;
- [fiche de fonctionnalité](docs/features/_template.md) pour cadrer un nouveau besoin ;
- [décisions](docs/decisions/README.md) pour consigner un choix technique important.

Respecter le périmètre demandé et les changements déjà présents. Ne pas déplacer
les fichiers, ajouter une dépendance ou refondre une couche sans besoin lié à la tâche.
Coordonner contrats partagés, API, consommateurs Web et tests lors d'un changement
transversal. Ne pas inventer de règle métier : distinguer code actuel, décision
validée et question à préciser ; signaler les écarts avant de changer un contrat.
Vérifier le périmètre touché et rapporter les commandes réellement exécutées.

Respecter ces conventions dans tout le projet.

| Élément | Convention | Exemple |
| --- | --- | --- |
| Langue technique | Anglais | `match_event`, `TeamPlayer` |
| Table PostgreSQL | Singulier, `snake_case` | `team_staff_member` |
| Colonne SQL | `snake_case` | `created_at`, `league_id` |
| Modèle Prisma / TypeScript | Singulier, `PascalCase` | `MatchEvent`, `StaffMember` |
| Variable TypeScript | `camelCase` | `matchdayId`, `createdAt` |
| Énumération | `UPPER_SNAKE_CASE` | `PENDING_VERIFICATION`, `OFFICIAL` |
| Ressource API | Pluriel, `kebab-case` | `/staff-members` |
| Paramètre de route | `camelCase` avec suffixe `Id` | `:teamId`, `:seasonId` |
| Route API | Préfixe versionné | `/api/v1/...` |
| Page publique | Pluriel, `kebab-case`, avec slug | `/teams/:teamSlug` |
| Administration | Préfixe `/admin`, UUID interne | `/admin/teams/:teamId` |
| Identifiant interne | UUID | `id`, `team_id` |
| Identifiant public | Slug ou ID public immuable | `teamSlug`, `matchPublicId` |
| Dates | ISO 8601 en API, `timestamptz` en base | `2026-08-31T14:30:00Z` |
| Historique | Ne pas supprimer les affectations | Renseigner `left_at` |
| Erreurs | Format commun | `{ "error": { "code": "...", "message": "..." } }` |
| Pagination | Paramètres communs | `?page=1&limit=25` |
| Tri | Préfixe `-` pour l’ordre décroissant | `?sort=-scheduledAt` |


Format Branch : XXXX-000/initialize-branch
Format commit : XXXX-000/initialize-commit-work

Écarts actuels aux conventions (routes, pagination, outillage Git) : consulter
[l'architecture commune](docs/ARCHITECTURE.md#écarts-et-points-à-préciser) si la tâche les touche.
