# Étape 1 : préparation de Lucarne au déploiement

## Périmètre

Préparer le code pour le futur VPS OVHcloud, sans déployer, exporter les données
de développement, modifier les règles métier ni regrouper automatiquement les
changements préexistants dans un commit.

## Changements réalisés

- L'API lit `TRUSTED_PROXY_IPS`, une liste d'adresses IPv4/IPv6 exactes. La valeur
  vide conserve le comportement d'accès direct : les en-têtes de proxy sont ignorés.
- Les adresses invalides, noms de machine, booléens, nombres de sauts et réseaux
  globaux sont refusés au démarrage. Les proxys doivent être déclarés explicitement.
- Des tests HTTP vérifient les quotas par client derrière un proxy déclaré,
  l'absence de confiance envers une connexion directe et les faux préfixes
  `X-Forwarded-For`. Aucun endpoint de diagnostic n'est ajouté en production.
- Le tutoriel associe une adresse Docker fixe à Caddy et déclare uniquement cette
  adresse dans l'API. Il reste à vérifier la disponibilité de ce sous-réseau et
  l'absence de ports API/PostgreSQL publics lors de l'installation sur le VPS.
- ESLint ignore les artefacts locaux sous `output/`. Docker les exclut également
  de son contexte de build, pour ne pas embarquer les exports et fichiers de travail.
- Deux fichiers de routes/permissions d'upload ont reçu leur fin de ligne manquante,
  sans changement de comportement, pour rendre le lint passant.

Les contrats API, le schéma Prisma et les migrations n'ont pas été modifiés par
cette préparation. Les modifications antérieures ont été conservées.

## Vérifications exécutées

| Commande | Résultat |
| --- | --- |
| `npm.cmd run test:api -- tests/unit/config/environment.test.ts tests/unit/config/proxy.test.ts` | 27 tests réussis après correction du montage des fixtures de test |
| `npm.cmd test` | Shared : 275 ; API : 282 ; Web : 690, tous réussis |
| `npm.cmd run check` | ESLint et types Shared/API/Web réussis après corrections des fins de fichier et exclusion d'output |
| `npm.cmd run build` | Build réussi ; avertissements Rollup sur Zod et bundle principal supérieur à 500 ko |
| `node apps/api/tests/migrations/run-isolated-integration.mjs` | 15 migrations rejouées dans une base neuve, 316 tests PostgreSQL réussis, base temporaire supprimée |
| `git diff --check` | Réussi après correction des fins de fichier |
| `npm.cmd ci --no-audit --no-fund --cache D:\Formation\lucarne\app\output\vps-step1\npm-cache` dans l'export propre | 662 packages installés depuis le lockfile |
| `npm.cmd run prisma:generate` et `npm.cmd run prisma:validate` dans l'export propre | Client généré et schéma valide sans les fichiers `.env` locaux |
| `npm.cmd run build` dans l'export propre | Types API/Web et build Vite réussis avec les mêmes avertissements Zod/bundle |

PostgreSQL de test a été démarré par `docker compose --profile test up -d db_test`,
puis arrêté par `docker compose --profile test stop db_test`. Son volume est
conservé. Les tests utilisent une base temporaire distincte des bases existantes.
Des avertissements de dépréciation `pg` sur des requêtes concurrentes ont été
émis pendant les intégrations ; ils n'ont pas fait échouer les tests.

Dans l'export propre, les permissions Windows du bac à sable ont d'abord bloqué
la génération Prisma puis le build Vite (`EPERM`). Les deux commandes ont réussi
après relance avec les permissions nécessaires. npm a signalé des scripts
d'installation non approuvés pour quatre packages ; aucune approbation de script
ni mise à jour de dépendance n'a été ajoutée pour contourner cet avertissement.

## Livraison à préparer

Un export des fichiers suivis et non ignorés a été préparé sous
`output/vps-step1/source`, avec un inventaire `output/vps-step1/release-manifest.txt`.
Il contient les deux PNG nécessaires au Web et la migration des slugs de ligues
`20261011230000_public_league_navigation`, actuellement non suivie par Git.
Les vrais fichiers `.env` sont exclus ; les exemples publics sont conservés.

Cet export représente un candidat basé sur l'état du dossier de travail, pas un
commit ou un clone du dépôt distant. Il inclut donc les changements non commités
du portail public, de l'authentification et des imports de matchs déjà présents
avant cette étape. Leur présence ne doit pas être oubliée lors de la livraison.

Avant le déploiement réel :

1. Examiner `git status --short` et l'inventaire pour choisir les changements à livrer.
2. Inclure les fichiers de code, tests, migrations et assets associés ; ne pas
   utiliser `git add .` sans examen de cet ensemble.
3. Créer la branche et le commit selon les formats du projet, avec le véritable
   identifiant de tâche ; aucun identifiant n'a été inventé dans cette préparation.
4. Réexécuter les vérifications dans un clone du commit sélectionné pour obtenir
   un SHA de livraison reproductible.

L'étape suivante porte sur la création/configuration du VPS et le nom DuckDNS,
selon [le tutoriel](DEPLOIEMENT-VPS-OVH.md). Les configurations proposées n'ont
pas encore été exécutées sous Linux ni sur le VPS.
