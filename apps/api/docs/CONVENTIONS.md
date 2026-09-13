# Conventions API

## Composition et validation

Les noms de fichiers métier suivent `<domain>.<responsibility>.ts`, comme
[league.controller.ts](../src/features/league/league.controller.ts). Les routes
utilisent le préfixe partagé monté dans `app.ts` ; ne pas le répéter dans les routers.

[validateRequest](../src/middlewares/validateRequest.ts) parse `body`, `params` et
`query` avec Zod puis remplace ces entrées par leurs valeurs validées. Réutiliser
[les schémas partagés](../../../packages/shared/src/schemas) pour les payloads
communs, et les schémas locaux pour les paramètres serveur. Examiner le schéma
du domaine : les PATCH League et Player n'ont pas la même sémantique de champs requis.
Ne pas rendre un schéma plus permissif ou changer une normalisation implicitement.

## Erreurs

Envelopper les handlers asynchrones avec [asyncHandler](../src/utils/asyncHandler.ts)
pour transmettre les rejets Express 4. Utiliser [AppError](../src/errors/AppError.ts)
pour une erreur métier ; [mapErrorToAppError](../src/errors/mapErrorToAppError.ts)
traduit Zod/Prisma et [errorHandler](../src/middlewares/errorHandler.ts) sérialise
le format commun, avec `details` optionnel pour les champs. Les erreurs inattendues
restent génériques ; ne pas exposer de payload sensible, SQL ou stack au client.
Les conflits de version passent par `RESOURCE_VERSION_CONFLICT`, distinct des doublons.

## Authentification et autorisation

[auth.routes.ts](../src/features/auth/auth.routes.ts) applique limitation des tentatives
et validation au login. [password.ts](../src/auth/password.ts) fait autorité pour
les bornes et Argon2id ; [jwt.ts](../src/auth/jwt.ts) signe/vérifie les JWT HS256.
[authenticate](../src/middlewares/authenticate.ts) vérifie le Bearer puis relit
l'utilisateur actif et son rôle courant en base ; `request.user` contient son ID et rôle.
[requireRoles](../src/middlewares/requireRoles.ts) contrôle ensuite les rôles.
Les restrictions par ressource se trouvent aussi dans les services/permissions.
Ne pas déduire la matrice complète des constantes générales ou des boutons Web.

L'environnement est validé par [environment.ts](../src/config/environment.ts).
Les [modèles et l'installation](../../../README.md) expliquent son chargement ;
les paramètres de limitation du login ont des valeurs par défaut dans le validateur.

## Listes

Le [schéma générique](../../../packages/shared/src/schemas/pagination.schema.ts)
porte la convention commune `page`, `limit`, `search`, `sort` et sa liste de champs
de tri autorisés. Les contrats métier
[League](../../../packages/shared/src/schemas/league.schema.ts),
[Team](../../../packages/shared/src/schemas/team.schema.ts) et
[Player](../../../packages/shared/src/schemas/player.schema.ts) utilisent notamment
`pageSize`, `sortBy`, `sortOrder`. Préserver les paramètres et réponses réels de la
ressource ; toute harmonisation doit être cadrée avec les consommateurs Web.
