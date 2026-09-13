# Architecture API

## Points d'entrée

[server.ts](../src/server.ts) charge l'environnement, contrôle PostgreSQL et ouvre
le port. [app.ts](../src/app.ts) compose Helmet, CORS, JSON, routes versionnées,
fallback Web de production puis gestion des erreurs ; il est importable sans
démarrer le serveur. [router.ts](../src/router.ts) monte auth, health, leagues,
teams et players.

## Couches par domaine

La feature [league](../src/features/league) illustre le circuit :

| Fichier | Responsabilité |
| --- | --- |
| `league.routes.ts` | Verbe/chemin HTTP, authentification, rôles et validation |
| `league.schema.ts` | Réemploi des schémas partagés et paramètres propres au serveur |
| `league.controller.ts` | Entrées HTTP typées, appel du service, statut et DTO (dates ISO) |
| `league.service.ts` | Règles métier, erreurs applicatives et orchestration |
| `league.repository.ts` | Requêtes Prisma, transactions et écritures conditionnelles |

Ajouter une feature sous `src/features/<domain>` et la monter dans `router.ts`.
Respecter les couches utiles au domaine ; health n'a pas de repository et
[auth.service.ts](../src/features/auth/auth.service.ts) accède directement à Prisma.
Ne pas créer des couches vides pour uniformiser ces exceptions.

Les modules transversaux sont `src/auth`, `src/middlewares`, `src/errors`,
`src/config`, `src/utils` et `src/types`. Les permissions métier supplémentaires
sont locales, par exemple [team.permissions.ts](../src/features/team/team.permissions.ts).

## Persistance et frontières

[database/prisma.ts](../database/prisma.ts) centralise Prisma avec l'adaptateur pg ;
[database/client.ts](../database/client.ts) centralise le pool PostgreSQL.
Ne pas créer un client par requête. Les transactions restent côté serveur et
l'invalidation du cache Web intervient après la réussite de la requête.

Pour modifier la base, lire [DATA_MODEL](DATA_MODEL.md). Pour les DTO, validations,
erreurs et droits, lire [CONVENTIONS](CONVENTIONS.md). Les modèles générés de Prisma
restent internes ; les contrats destinés au navigateur sont dans `@lucarne/shared`.
