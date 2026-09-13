# LEAGUE-011 — Clarification des règles de modification d’une ligue

> **Lecture actuelle (2026-09-13)** : cette fiche conserve des constats et propositions
> successifs, dont certains sont dépassés. Pour intervenir sur l'édition, commencer
> par cette note et les sections « Décisions validées » et « Contrat partagé validé ».
> Le [service actuel](../apps/api/src/features/league/league.service.ts) implémente
> déjà le PATCH conditionnel, les erreurs et le versionnement ; il ne restreint plus
> `isActive` selon le rôle. Les [routes](../apps/api/src/features/league/league.routes.ts)
> permettent l'édition, l'activation et la désactivation à ADMIN, MODERATOR et EDITOR.
> Les descriptions « aucun formulaire », « aucun versionnement » et la restriction
> de statut ADMIN en fin de fiche sont donc historiques, pas le contrat actuel.
> L'[adaptateur Web](../apps/web/src/schemas/league.schema.ts) gère déjà le logo vide
> vers `null`. La confirmation produit des droits de statut, la visibilité publique
> et les exigences supplémentaires sur les logos restent à préciser ; cette mise
> au point constate le code et ne valide aucune nouvelle règle métier.

> Document de clarification préalable à l’implémentation. Aucun comportement applicatif, modèle Prisma, migration, route, donnée ou checklist Trello n’est modifié par ce document.

## Objectif de l’US

Permettre à un utilisateur autorisé de mettre à jour une ligue existante afin de corriger ou actualiser son nom, son pays, son logo ou son statut.

Le dépôt est un monorepo npm utilisant des workspaces (`apps/api`, `apps/web`, `packages/shared`). Le backend est Express + Prisma/PostgreSQL ; le frontend est React + React Router + TanStack Query ; les contrats partagés utilisent Zod et TypeScript.

## Périmètre

- Modification de `name`, `country`, `logoUrl` et `isActive` d’une ligue existante.
- Contrôle d’authentification et d’autorisation côté API, avec cohérence côté interface.
- Validation des valeurs, maintien de l’unicité `name + country`, réponse d’erreur exploitable par le formulaire.
- Détection d’une modification concurrente et absence de mise à jour partielle.
- Rafraîchissement des listes et du détail après succès.

## Hors périmètre

- Modification de `id` ou `createdAt`.
- Modification des saisons, équipes, participations, matchs, classements ou autres relations.
- Suppression de ligue, qui existe déjà comme fonctionnalité distincte et combine désactivation puis suppression définitive.
- Création d’une migration ou modification du modèle Prisma dans cette étape.
- Accessibilité réseau du logo, normalisation rétroactive des données existantes et exposition d’une route publique : aucune convention publique correspondante n’a été trouvée.

## Champs modifiables

| Champ | Constat du code | Règle proposée | Statut |
| --- | --- | --- | --- |
| `name` | `String @db.VarChar(150)`, obligatoire ; Zod trim, non vide, max 150 | Accepter une chaîne trimée, non vide, de 1 à 150 caractères ; conserver casse, accents, ponctuation et espaces internes saisis | Validation confirmée par code pour la création ; extension à la modification déduite de la convention |
| `country` | `String @db.VarChar(100)`, obligatoire ; Zod trim, non vide, max 100 | Accepter une chaîne trimée, non vide, de 1 à 100 caractères ; le code utilise un nom de pays libre, pas un code ISO ni une liste fermée | Validation confirmée par code pour la création ; extension à la modification déduite de la convention |
| `logoUrl` | `String?` mappé vers `logo_url`, sans longueur SQL ; API Zod accepte une URL optionnelle ; formulaire accepte `""` et la transforme en absence | Champ facultatif ; permettre la suppression du logo avec `null` (contrat à ajouter explicitement) ou la représentation retenue par le contrat d’update ; URL validée selon la même règle Zod que la création | Format URL confirmé par code ; suppression par `null` à valider |
| `isActive` | `Boolean`, non nul ; défaut Prisma/migration `false` (la migration récente remplace le défaut initial SQL `true`) | Booléen obligatoire dans un remplacement complet, ou optionnel dans un PATCH avec sémantique explicite ; true/false autorisés | Type et défaut confirmés par code ; forme de l’update à décider |

Les caractères Unicode, les accents et la casse sont actuellement acceptés par les schémas. Le trim porte sur les extrémités ; aucune réduction des espaces multiples internes, translittération ou suppression des accents n’est actuellement appliquée. Cette conservation est recommandée pour l’affichage, sous réserve de la décision d’unicité ci-dessous.

## Champs immuables

`id` est la clé primaire UUID et ne doit jamais être pris dans le payload de mise à jour. `createdAt` est un timestamp de création et ne doit jamais être modifié. Le schéma d’update doit être `.strict()` et ne contenir que les quatre champs modifiables, plus le marqueur de concurrence retenu. Toute tentative d’envoyer `id`, `createdAt` ou un champ relationnel doit être rejetée comme requête invalide.

## Rôles autorisés

Les rôles réellement définis sont exactement `ADMIN`, `MODERATOR`, `EDITOR` et `USER` (`apps/api/src/auth/appRole.ts`). `USER` ne peut pas consulter les ligues. La consultation Dashboard est actuellement autorisée à `ADMIN`, `MODERATOR` et `EDITOR`, côté API et côté web.

| Action | Règle actuellement implémentée | Règle recommandée pour LEAGUE-011 | Statut |
| --- | --- | --- | --- |
| Voir une ligue / la liste | `ADMIN`, `MODERATOR`, `EDITOR` | Conserver ces trois rôles | Confirmée par code |
| Ouvrir le formulaire d’édition | Aucun formulaire ni route existants | `ADMIN`, `MODERATOR`, `EDITOR` | Recommandation alignée sur le contrat fonctionnel |
| Soumettre une modification | Aucune route d’update existante | `ADMIN`, `MODERATOR`, `EDITOR` | Confirmée par carte/contrat fonctionnel ; à implémenter |
| Modifier chacun des quatre champs | Aucune granularité de permission existante | Même droit pour les trois rôles | À valider avec le Product Owner si une granularité est attendue |
| Modifier une ligue active | Pas d’update ; les actions activate/deactivate sont réservées à `ADMIN` | Les trois rôles peuvent modifier les quatre champs, y compris le statut | Contradiction potentielle avec les permissions d’activation actuelles ; à valider |
| Désactiver / réactiver | `ADMIN` uniquement via `/activate` et l’action de désactivation existante | Contrat LEAGUE-011 indique les trois rôles pour `isActive` | Incohérence à arbitrer |

Le frontend autorise actuellement uniquement `ADMIN` à créer, et uniquement `ADMIN` à activer/désactiver/supprimer dans la liste. La checklist mentionnant « compétition » et limitant l’écriture à Admin + Rédacteur autorisé est incohérente avec le contrat fourni et avec les noms réels du code (`league`, `EDITOR`). Recommandation : utiliser partout « ligue » et `ADMIN`, `MODERATOR`, `EDITOR` pour l’édition ; faire confirmer explicitement au Product Owner si Modérateur doit aussi pouvoir changer `isActive`.

## Règles de validation

La validation API doit précéder toute écriture et réutiliser les schémas partagés autant que possible. Les erreurs doivent utiliser le format existant `{ error: { code, message, details? } }`; pour Zod, `details[].field` est le chemin du champ.

- `name` : obligatoire dans un remplacement complet ; 1–150 caractères après trim ; valeur vide refusée ; extrémités trimées ; espaces internes, casse, accents et caractères spéciaux conservés. Aucun contrôle de liste de noms n’existe.
- `country` : obligatoire dans un remplacement complet ; 1–100 caractères après trim ; nom libre tel que `France` ou `Belgium`, sans code ISO ni liste fermée dans le code ; casse et accents conservés.
- `logoUrl` : optionnel et nullable recommandé pour permettre l’effacement ; la création utilise `z.url()` et le formulaire accepte une chaîne vide convertie en valeur absente. Aucun contrôle d’accessibilité de la ressource n’existe et ne doit être ajouté implicitement. La limite de longueur n’est pas définie dans Prisma/SQL ; une limite applicative explicite est une question produit/technique à trancher avant l’implémentation.
- `isActive` : booléen strict uniquement ; pas de chaîne `"true"`/`"false"`. Le défaut de création est `false`, mais une modification doit porter une intention explicite pour éviter une désactivation implicite.

Le payload d’update doit être strict, sans champs inconnus. Pour préserver les saisies invalides et afficher les erreurs au bon endroit, le frontend doit laisser React Hook Form conserver les valeurs et mapper les `details` API vers les champs ; le message global reste réservé aux erreurs sans champ.

## Règles d’unicité

La base possède `UNIQUE (name, country)` (`uq_league_name_country`). Elle s’applique à toutes les ligues, actives ou inactives, et non seulement aux ligues visibles. Une modification qui ne change pas le couple doit être acceptée en excluant la ligue courante ; une modification vers le couple d’une autre ligue, même inactive, doit être refusée.

PostgreSQL compare actuellement les colonnes textuelles de manière sensible à la casse et aux accents, et la contrainte compare les valeurs stockées telles quelles. La validation Zod de création trim les nouvelles valeurs, mais la base autorise encore des espaces en bordure dans les données déjà présentes ; une migration de normalisation n’est pas prévue ici. Le service doit appliquer une normalisation décidée explicitement et ne pas faire un pré-contrôle applicatif qui divergerait de la contrainte DB.

Deux requêtes concurrentes visant le même couple doivent être arbitrées par la contrainte de base ; l’une réussit et l’autre reçoit `409 RESOURCE_ALREADY_EXISTS`. Si l’exigence est une unicité insensible à la casse, aux accents ou aux espaces multiples, elle nécessite une décision et une évolution de schéma/index (hors de cette étape), pas seulement un contrôle de service.

## Règles liées à `isActive`

`isActive` est un booléen non nul, avec défaut actuel `false`. Le modèle relie une ligue à plusieurs `Season`; les saisons relient à leur tour matchdays et participations. Les clés étrangères sont `ON DELETE RESTRICT`, mais aucune contrainte/triggers inspectée n’interdit directement de désactiver une ligue. Une désactivation ne doit donc pas supprimer, modifier ou désactiver ses saisons, équipes, participations, matchs ou classements.

Le Dashboard sait filtrer `ACTIVE`, `INACTIVE` ou `ALL`, et affiche les ligues inactives. Aucune route de portail public n’a été trouvée ; la visibilité publique est donc non spécifiée, et il ne faut pas en déduire un comportement. Les actions actuelles affichent une confirmation avant activation/désactivation ; cette convention est à conserver pour une transition de statut, sous réserve de l’arbitrage des rôles.

## Gestion de la concurrence

Le modèle ne possède ni `updatedAt`, ni champ entier `version`, ni mécanisme de verrouillage optimiste. `createdAt` ne peut pas servir de version. Recommandation : ajouter ultérieurement un champ entier `version` (ou équivalent explicitement choisi) incrémenté atomiquement à chaque mise à jour ; le frontend renvoie la version lue avec le formulaire.

L’écriture doit cibler `id` et `version` attendue. Si aucune ligne ne correspond, distinguer « ligue inexistante » de « version périmée » autant que possible ; pour une version périmée, répondre `409` avec `code: "RESOURCE_VERSION_CONFLICT"`, un message explicite (« La ligue a été modifiée par un autre utilisateur. Rechargez les données avant de réessayer. ») et, si utile, la ressource courante. Le frontend conserve les saisies, bloque le remplacement silencieux, signale le conflit et propose un rechargement manuel ou contrôlé.

Cette évolution du modèle est nécessaire pour satisfaire réellement la non-écrasement concurrente. L’usage de `updatedAt` seul est déconseillé ici : il n’existe pas encore et sa précision/gestion des égalités seraient moins explicites qu’un compteur entier.

## Garantie d’atomicité

La validation de forme, du strict payload et de la version doit avoir lieu avant l’écriture. L’unicité doit être garantie par la contrainte DB, pas par un simple `find` préalable. L’opération de mise à jour des quatre colonnes et l’incrément de version doivent constituer une seule instruction conditionnelle ; elle ne doit produire aucune mise à jour si la validation, l’unicité ou la version échoue.

Une transaction devient obligatoire si l’implémentation ajoute des effets persistants (audit, historique, outbox). L’invalidation du cache et la revalidation frontend interviennent après le commit et ne doivent jamais être considérées comme faisant partie de la transaction DB. Les erreurs Prisma (`P2002`, `P2025` et le code de conflit choisi) doivent être mappées vers le format d’erreur commun.

## Comportement attendu de l’API

Recommandation : `PATCH /api/v1/leagues/:leagueId`, protégé par `authenticate`, `requireRoles(ADMIN, MODERATOR, EDITOR)` et validation des paramètres/body. Le body contiendrait uniquement les champs modifiés ; si un remplacement complet est préféré, il faut le documenter explicitement car cela change la gestion des absences.

Réponse de succès recommandée : `200` avec la ligue persistée, incluant `id`, les quatre champs, `createdAt` immuable et le marqueur de version retenu. Le contrat actuel transforme les dates en ISO 8601 et expose `status` pour les lectures ; la réponse d’update doit rester cohérente avec ce contrat.

Codes recommandés : `400 VALIDATION_ERROR` (avec détails par champ), `401 AUTHENTICATION_REQUIRED`, `403 INSUFFICIENT_ROLE`, `404 RESOURCE_NOT_FOUND`, `409 RESOURCE_ALREADY_EXISTS` pour le couple déjà utilisé, `409 RESOURCE_VERSION_CONFLICT` pour concurrence, `500 INTERNAL_SERVER_ERROR` pour l’inattendu.

## Comportement attendu du front-end

Ajouter un accès « Modifier » sur la consultation/listing uniquement pour les rôles autorisés après arbitrage. Réutiliser les composants `FormField`, `Input`, `Checkbox`, `Alert`, React Hook Form et les schémas de `apps/web/src/schemas/league.schema.ts`. Les quatre champs doivent être préremplis ; `id`, `createdAt` et les relations ne doivent pas être éditables.

À la soumission, désactiver le bouton pendant la requête, conserver les valeurs en cas d’erreur et mapper les erreurs de validation sur `name`, `country`, `logoUrl` et `isActive`. Après succès, invalider `['league', id]`, les listes `['leagues']` et, si le pays change, la liste des pays `['league-countries']` si cette clé est retenue par le hook. Le hook existant invalide actuellement les listes après activation/suppression, mais pas le détail ; cette extension est nécessaire pour la visibilité immédiate attendue.

## Codes d’erreur recommandés

Les codes suivent les conventions actuelles (`VALIDATION_ERROR`, `RESOURCE_NOT_FOUND`, `RESOURCE_ALREADY_EXISTS`, `INSUFFICIENT_ROLE`). Ajouter `RESOURCE_VERSION_CONFLICT` seulement avec le mécanisme de version ; ne pas réutiliser `RESOURCE_CONFLICT` pour masquer la cause à l’interface.

## Critères d’acceptation consolidés

1. Un utilisateur autorisé peut modifier `name`, `country`, `logoUrl` et `isActive` d’une ligue existante.
2. `id` et `createdAt` restent inchangés et les champs inconnus sont refusés.
3. Les limites et règles de trim de création sont appliquées à la modification.
4. Une URL de logo invalide, un booléen invalide ou une valeur obligatoire vide renvoie `400` avec détails de champ et sans écriture.
5. Le couple `name + country` reste unique pour toutes les ligues, y compris inactives ; un doublon renvoie `409`.
6. Les rôles autorisés sont déterminés de façon identique côté API et côté interface.
7. Une désactivation ne supprime ni ne modifie les relations associées.
8. Une version périmée ne peut pas écraser une modification plus récente et renvoie `409` explicite.
9. Toute erreur laisse la ligue inchangée.
10. Après succès, la réponse et les vues concernées reflètent immédiatement les valeurs persistées.
11. Les saisies restent présentes après une erreur et les erreurs de champ sont affichées au champ concerné.

## Incohérences détectées dans la checklist Trello

- « Compétition » ne correspond pas à la ressource du code, qui est `League` / « ligue ». Recommandation : harmoniser le vocabulaire.
- La checklist « Admin et rédacteur autorisé uniquement » exclut `MODERATOR`, alors que le contrat fourni inclut Modérateur et que les permissions de lecture utilisent les trois rôles. Impact : le bouton et l’API pourraient diverger selon la source suivie. Recommandation : retenir les trois rôles pour l’édition générale, et faire valider séparément le droit de changer `isActive`.
- La checklist semble assimiler activation/désactivation à modification générale, alors que le code les réserve actuellement à `ADMIN`. Arbitrage PO requis.

## Décisions confirmées par le code existant

- Monorepo npm workspaces, backend Express/Prisma/PostgreSQL, frontend React/TanStack Query.
- Rôles exacts : `ADMIN`, `MODERATOR`, `EDITOR`, `USER`.
- Lecture ligue : trois rôles métier ; création : `ADMIN` seulement ; activation/désactivation/suppression : `ADMIN` seulement.
- Champs et tailles League : `name` 150, `country` 100, `logoUrl` nullable sans longueur DB, `isActive` booléen default false, `createdAt` timestamptz, `id` UUID.
- Unicité DB exacte sur `(name, country)` ; relation League → Season ; suppressions restreintes par clés étrangères.
- Erreurs API structurées et détails Zod par champ.
- Cache React Query avec `staleTime` de 30 secondes et invalidation existante des listes pour les mutations de statut/suppression.

## Décisions validées pour l’implémentation de LEAGUE-011

Les décisions suivantes sont validées pour cette US et ne sont plus considérées comme des questions bloquantes pour l’étape de versionnement :

- Ajouter `League.version`, entier non nullable, initialisé à `0` pour les lignes existantes et les nouvelles ligues.
- Incrémenter `version` atomiquement à chaque modification réussie.
- Utiliser `409` et le code `RESOURCE_VERSION_CONFLICT` pour une version périmée ; ne jamais écraser silencieusement une modification plus récente.
- En cas de conflit, conserver les saisies côté frontend et demander un rechargement explicite.
- Maintenir `uq_league_name_country` telle quelle, pour toutes les ligues actives ou inactives.
- Conserver une unicité sensible à la casse et aux accents, sans normalisation rétroactive.

La migration `20260911130000_league_optimistic_version` ajoute la colonne SQL `version INTEGER NOT NULL DEFAULT 0` sans modifier les autres champs, relations ou contraintes. Le repository expose déjà une opération préparatoire `updateLeagueOptimistic` utilisant `id + expectedVersion`, les quatre champs métier et `version: { increment: 1 }`; son résultat `count` permettra au service futur de distinguer une mise à jour réussie d’une version périmée. Le mapping complet des erreurs et la distinction ligue inexistante/version périmée restent réservés à l’étape suivante.

## Hypothèses restantes

- Une modification d’URL vide doit représenter une suppression de logo.
- Un PATCH partiel est préférable à un PUT complet, mais le choix n’est pas encore codé.
- L’unicité métier doit rester sensible à la casse et aux accents tant qu’aucune décision contraire n’est prise.
- Les ligues inactives restent consultables dans le Dashboard et leurs relations restent intactes.
- Il n’existe pas de portail public à prendre en compte dans ce dépôt.

## Questions bloquantes nécessitant une validation produit

1. Le Modérateur peut-il modifier les quatre champs, notamment désactiver/réactiver une ligue, ou la règle Trello « Admin + Editor » doit-elle prévaloir ?
2. Une ligue inactive doit-elle rester visible dans un éventuel portail public ?
3. La suppression de `logoUrl` doit-elle être exprimée par `null`, chaîne vide ou absence du champ ?
4. Faut-il imposer une limite de longueur à `logoUrl` et vérifier l’accessibilité distante du logo ?

Les décisions relatives à `version`, à `RESOURCE_VERSION_CONFLICT`, au comportement concurrent et à l’unicité sont désormais validées pour l’implémentation de cette US. La question des permissions de statut reste bloquante pour l’étape de contrat d’API ; aucune implémentation ne doit arbitrer silencieusement ce point.

## Recommandations pour les étapes suivantes

1. Ajouter le type partagé et le schéma strict d’update en réutilisant les règles de création.
2. Implémenter service/controller/route avec mise à jour conditionnelle et mapping des erreurs.
3. Implémenter le formulaire et les hooks React Query, en invalidant détail, listes et pays.
4. Couvrir les tests unitaires, API et frontend : permissions, validation, doublons actifs/inactifs, immutabilité, concurrence, atomicité, conservation des saisies et revalidation.

## Contrat partagé validé pour l’update

Le contrat d’update est un PATCH partiel défini dans `packages/shared/src/schemas/league.schema.ts` par `updateLeagueInputSchema`, avec le type `UpdateLeagueInput`. `version` est obligatoire, entier strict et supérieur ou égal à `0`. Au moins un champ métier doit être présent ; un payload contenant uniquement `version` est refusé. Le schéma est strict et rejette `id`, `createdAt`, les relations et tout champ inconnu.

La convention retenue pour `logoUrl` est la suivante : champ absent = ne pas modifier le logo ; `null` = supprimer le logo ; URL valide = remplacer le logo ; chaîne vide = invalide dans le contrat partagé. Le formulaire pourra présenter une saisie vide, mais devra la convertir en `null` à un point unique avant validation/envoi, sans double normalisation. `name` et `country` trim uniquement leurs extrémités et conservent casse, accents et espaces internes. `isActive` reste un booléen strict sans valeur par défaut dans un PATCH.

Le code partagé `RESOURCE_VERSION_CONFLICT` est exporté depuis `packages/shared/src/constants/api.ts`. Il est réservé au conflit de concurrence ; il ne représente ni une erreur de validation, ni un doublon, ni une ressource inexistante. La validation du payload reste distincte du contrôle ultérieur `id + version` effectué par le repository/service.

## Contrat API implémenté — étape LEAGUE-011

L’endpoint `PATCH /api/v1/leagues/:leagueId` est protégé par authentification et accessible pour l’édition générale aux rôles `ADMIN`, `MODERATOR` et `EDITOR`. Le body est le payload PATCH partagé, avec `version` obligatoire et au moins un champ métier.

La mise à jour construit dynamiquement les données Prisma uniquement à partir des champs présents, puis exécute une instruction conditionnelle `updateManyAndReturn` sur `id + version`, avec incrément DB de `version`. Une absence de ligne est ensuite distinguée autant que possible : ligue absente = `404 RESOURCE_NOT_FOUND`, version périmée = `409 RESOURCE_VERSION_CONFLICT`. Un doublon PostgreSQL `P2002` est retourné en `409 RESOURCE_ALREADY_EXISTS` avec un message explicite. La ligue persistée, sa nouvelle version, son `id` et son `createdAt` sont retournés en `200`.

Conformément à la restriction existante, le service refuse une modification de `isActive` pour `MODERATOR` et `EDITOR` avec `403 INSUFFICIENT_ROLE`; `ADMIN` peut modifier ce champ. Cette règle est une hypothèse conservatrice d’implémentation et reste à confirmer par le Product Owner, sans modification de la matrice globale des permissions.
