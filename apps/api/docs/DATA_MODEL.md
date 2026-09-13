# Modèle de données

## Sources faisant autorité

Lire [schema.prisma](../prisma/schema.prisma) pour modèles, relations, mappings et
index ; lire aussi les [migrations SQL](../prisma/migrations) pour les CHECK,
extensions, triggers et évolutions non entièrement représentées par Prisma.
La baseline `0_init` seule ne décrit pas l'état actuel.

## Entités principales

| Modèles | Relations et contraintes structurantes |
| --- | --- |
| Role, AppUser | Un rôle par utilisateur ; email unique en `citext`, hash du mot de passe et statut contrôlé |
| League, Season | Saisons d'une ligue ; unicité ligue `(name, country)` et saison `(leagueId, name)` ; au plus une saison active par ligue via index partiel |
| Matchday | Journées d'une saison ; numéro unique dans la saison |
| Team, Participation | Inscription équipe/saison ; clé primaire composée `(teamId, seasonId)`, points et rang contraints |
| Player, TeamPlayer | Historique des affectations à une équipe ; au plus une affectation ouverte par joueuse (`left_at IS NULL`) |
| StaffMember | Membre de staff rattaché directement à une équipe ; pas de modèle `team_staff_member` actuellement |
| GameMatch, MatchEvent | Match d'une journée, équipes domicile/extérieur distinctes ; événement lié au match et à une joueuse |

Les UUID et mappings SQL suivent les conventions communes, avec la clé composée
de Participation comme exception existante. Les horodatages sont `timestamptz`,
mais les dates civiles (`birthday`, `joinedAt`, `leftAt`, dates de saison/match)
sont SQL `date` et `startTime` est `time` : ne pas convertir leur sémantique en instant.
Les statuts sont principalement des chaînes contraintes en SQL, pas des enums Prisma.

## Contraintes à préserver

- La [baseline](../prisma/migrations/0_init/migration.sql) active `pgcrypto` et `citext`,
  vérifie textes non vides, dates, scores, statuts et relations. Ses triggers contrôlent
  l'équipe active lors d'une inscription et l'inscription des équipes à la saison du match.
- Les migrations League ajoutent le défaut inactif et `version` ; Player possède
  aussi `version`, mais Team n'en possède pas. La concurrence optimiste est mise
  en œuvre dans les repositories/services concernés, pas par un trigger global.
- La [migration Player](../prisma/migrations/20260912100000_player_crud/migration.sql)
  impose les dates d'affectation cohérentes et un numéro de maillot entre 1 et 99 s'il est renseigné.
- La [migration de référence des affectations](../prisma/migrations/20260913120000_team_player_source_of_truth/migration.sql)
  supprime `player.team_id` après reprise atomique des données ; elle refuse les
  contradictions historiques. `team_player` est désormais l'unique source du lien.
  L'affectation ouverte peut être future : voir [player.assignment.ts](../src/features/player/player.assignment.ts)
  pour la distinction actuelle/planifiée. Clore via `leftAt`, préserver l'historique
  et les clés étrangères restrictives ; ne pas recréer l'ancien lien direct.

## Seeds

[bin/seed.ts](../bin/seed.ts) orchestre [database/seeders](../database/seeders) dans
une transaction. Les données de démonstration utilisent IDs stables et Faker ;
la réexécution remet certaines valeurs à l'état initial. Le seed refuse la production.
[user.seeder.ts](../database/seeders/user.seeder.ts) exige `DEMO_ADMIN_PASSWORD` en
développement et peut mettre à jour le mot de passe du compte de démonstration existant.
La politique effective de mot de passe est définie par [password.ts](../src/auth/password.ts),
pas par le texte indicatif du modèle d'environnement.

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

