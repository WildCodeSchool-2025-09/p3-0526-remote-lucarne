# Architecture commune

## Organisation et responsabilités

Lucarne gère des ligues, équipes et joueuses de football ; le schéma contient aussi
saisons, participations, journées, matchs et événements, sans routes dédiées à tous ces modèles.

| Emplacement | Responsabilité / extension |
| --- | --- |
| `apps/api/src/features/<domain>` | Routes Express, contrôleurs, services et repositories du domaine |
| `apps/api/database`, `apps/api/prisma` | Clients de base, seeds, schéma et migrations |
| `apps/web/src/features/<domain>` | Pages et composants métier, hooks/utilitaires selon le domaine |
| `apps/web/src/services`, `src/hooks`, `src/schemas` | Services HTTP, hooks existants et adaptation des formulaires (chemins relatifs à `apps/web`) |
| `apps/web/src/ui`, `src/styles` | Composants réutilisables et styles |
| `packages/shared/src` | Constantes, schémas Zod, types HTTP et utilitaires purs |
| `packages/eslint-config`, `packages/typescript-config` | Configurations communes |
| `docs/features`, `docs/decisions` | Besoins et décisions futures ; conserver les fiches existantes à leur emplacement |

Pour intervenir dans une couche, lire l'[architecture API](../apps/api/docs/ARCHITECTURE.md)
ou [Web](../apps/web/docs/ARCHITECTURE.md).

## Échanges et contrats

Page → hook TanStack Query → service Web → client HTTP → route API → service métier
→ repository → Prisma/PostgreSQL. Les contrôleurs produisent les DTO JSON.
Les détails de transport et d'environnement sont dans le
[README](../README.md#communication-et-environnement), à lire pour raccorder les applications.

[Shared](../packages/shared/package.json) exporte du TypeScript source, par la racine
et les entrées `constants`, `schemas`, `types`, `utils`. Un schéma partagé reste
indépendant de React, Express et Prisma ; dériver les types validés avec `z.infer`.
Lors d'une évolution de contrat, vérifier le schéma/type partagé, la route et sa
sérialisation, le service/formulaire Web, puis leurs tests. Ne pas généraliser une
particularité d'une ressource à toutes les autres.

## Exécution

En développement, Vite et Express sont deux processus ; le service Compose `web`
lance les deux. En production, [Express](../apps/api/src/app.ts) sert aussi
`apps/web/dist` avec un fallback SPA, sauf pour `/api` et les fichiers absents.
[Compose production](../docker-compose.prod.yml) migre, construit puis démarre l'API ;
le réseau Traefik `proxy` et l'environnement externe sont des prérequis.
Lire [.github/CI.md](../.github/CI.md) pour les validations CI ou le déploiement ;
les workflows restent la référence exécutable. Le script VPS n'est pas dans ce dépôt.

## Écarts et points à préciser

- Les conventions racine prévoient `/admin` et des pages publiques avec slug ;
  le [routeur actuel](../apps/web/src/router.tsx) utilise `/dashboard/...` et des UUID,
  avec l'alias `/dashboard/league`. Aucun portail métier public avec slugs n'est implémenté.
  Ne pas renommer ces routes à l'occasion d'une autre fonctionnalité ; l'évolution reste à préciser.
- La convention commune de pagination/tri et les contrats des listes diffèrent :
  lire les [conventions API](../apps/api/docs/CONVENTIONS.md#listes) avant de toucher une liste.
- Les formats Git restent ceux d'AGENTS.md, mais
  [.validate-branch-namerc](../.validate-branch-namerc) accepte tout et
  [commitlint](../commitlint.config.js) étend Conventional Commits. Leur alignement est à préciser,
  sans changer silencieusement la règle écrite ou les outils.
- Pour LEAGUE-011, lire la [fiche existante](league-011-business-rules.md) : elle
  distingue désormais son historique du code actuel. La confirmation produit des droits
  de statut et des exigences publiques reste à préciser.
- Aucun contrat OpenAPI ni générateur trouvé. Les routes, schémas partagés et tests
  HTTP font référence ; pas de YAML manuel concurrent présenté comme exhaustif.
