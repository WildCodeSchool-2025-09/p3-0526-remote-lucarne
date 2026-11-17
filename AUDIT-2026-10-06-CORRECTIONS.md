# Corrections de l'audit Lucarne — 6 octobre 2026

## Résultat et périmètre

Les constats ont été revérifiés dans le code actuel avant intervention. Les
corrections ont été réalisées par lots, sans migration, seed, reset des bases
existantes, mise à jour de dépendance, changement de route ou de contrat Shared.
Le travail préexistant est conservé. Aucun commit, staging ou déploiement effectué.

| Constat | État | Changement et validation |
| --- | --- | --- |
| F01 | Code corrigé ; contrôle visuel restant | `playerStyles.formLayout` restauré avec `grid min-w-0 gap-6`, partagé par création et modification. Build/types passent ; les tests existants vérifient les sections et formulaires distincts. Le rendu réel ordinateur/mobile n'a pas pu être contrôlé |
| F02 | Corrigé localement | CI : validate → deploy → status → diff. La séquence exacte passe avec une installation propre et une nouvelle base PostgreSQL temporaire ; aucun run GitHub Actions réel exécuté |
| F03 | Ressources rendues versionnables ; export propre vérifié | Exceptions Git limitées aux deux PNG existants ; les autres documents Web restent ignorés. Les deux fichiers sont présents dans l'export propre et incorporés au bundle. Ils doivent être inclus dans le futur commit avec les sources |
| F04 | Corrigé | Maximum 10 000 compteurs IP/email hachés de taille fixe ; purge des expirés à chaque requête ; refus des nouvelles clés à saturation, sans éviction des compteurs actifs. Tests expiration, normalisation, éviction, saturation, afflux de clés, emails longs et désactivation explicite |
| F05 | Question ouverte, CSP inchangée | Aucune liste d'origines autorisées trouvée. Question envoyée : même origine + domaines HTTPS précis, toutes origines HTTPS, ou même origine uniquement ? Les domaines précis doivent être indiqués |
| F06 | Corrigé | Purge Query/Mutation lors du remplacement du token ou logout ; annulation des HTTP en cours ; révision empêchant la livraison des réponses précédentes. Gardes supplémentaires des callbacks de mutations après une invalidation asynchrone et de l'écriture du token après deux réponses de connexion simultanées |
| F07 | Corrigé | P2034 et SQLSTATE de sérialisation/deadlock traduits en 409 `RESOURCE_VERSION_CONFLICT` pour update Season, sans retry. Tests injectés des formes Prisma et véritable test HTTP simultané : un succès, un conflit, version 1 et valeurs du gagnant conservées |
| F08 | Confirmation métier attendue ; code inchangé | Question envoyée : `scheduledMatchCount` doit-il compter les seuls matchs actifs SCHEDULED, publiés ou en préparation, et exclure les supprimés ? Les deux calculs actuels sont conservés jusqu'à confirmation, conformément à la consigne |
| F09 | Corrigé | Logs après classification : statut HTTP réel, code applicatif, méthode et motif de route. Pas d'URL brute, params, query, body, Authorization, message d'erreur, stack ou SQL. Tests 400/409/413/500 et absence de valeurs sensibles |
| F10 | Actualisé | README, architecture commune, conventions API/Web, modèle de données et CI actualisés ; anciennes étapes de Participation et contexte initial des photos identifiés comme historiques ; décisions validées séparées des questions ouvertes |

Pour F06, les tests couvrent une réponse tardive de requête et de mutation, JSON
encore en cours de parsing, réutilisation du même token après logout, deux logins
concurrents (y compris deux réponses résolues avant l'écriture des tokens),
401 tardif, conservation de la session après INVALID_CREDENTIALS,
annulation explicite et callback de succès retardé par une invalidation. Le cache
B reste intact et les callbacks A ne réintroduisent pas leurs données. L'annulation
du transport n'est pas un rollback d'une écriture déjà traitée par le serveur.

Le limiteur reste par couple IP/email et par processus. Une stratégie globale par
IP ou multi-instance serait une décision distincte ; ni les seuils existants ni
les proxys de confiance n'ont été modifiés. À saturation, le refus d'admission
conserve les protections existantes au prix d'un 429 pour les nouveaux couples.

## Vérifications et limites

Node v24.21.0, npm 11.19.0, Windows/PowerShell. Les tests de routes Web utilisent
jsdom et HTTP simulé ; les tests API PostgreSQL utilisent une nouvelle base réelle.

| Environnement | Vérification | Résultat |
| --- | --- | --- |
| Espace de travail local | `npm.cmd run check` | Lint et types Shared/API/Web réussis sur les corrections |
| Local | `npm.cmd test`, puis `npm.cmd run test:web` après la dernière garde de login | Shared 236, API 207, Web 395 : 838 tests réussis ; la suite Web complète a été rejouée après le dernier changement, Shared/API n'étaient pas touchés |
| Local, PostgreSQL isolé | `node apps/api/tests/migrations/run-isolated-integration.mjs` | 30 fichiers / 272 tests réussis après replay des 14 migrations ; base temporaire supprimée |
| Local | `npm.cmd run build` | Réussi ; avertissements d'annotations Zod/Rollup et bundle >500 kB conservés |
| Export propre | `npm.cmd ci`, puis `npm.cmd run prisma:generate` | 662 packages installés depuis le lockfile, nouveau client Prisma généré, sans copie des dépendances locales |
| Export propre | `npm.cmd run check` | Réussi sans `.env` privé |
| Export propre | `npm.cmd run build` | Réussi, avec les deux PNG inclus ; bundle principal de 707,28 kB, 200,89 kB gzip |
| Export propre, nouvelle base | `prisma validate`, `migrate deploy`, `migrate status`, `migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` | Quatre codes 0 ; 14 migrations appliquées ; aucune dérive ; base temporaire supprimée |
| Export propre | Suites Shared/API | 236 + 207 tests réussis |
| Export propre | Suite Web complète | 62 fichiers / 395 tests réussis au dernier rejeu ; aucune dépendance à un `.env` privé |
| Local et propre | Tests MATCH ciblés | 31 tests réussis dans les deux configurations d'URL API |
| Navigateur réel | Inventaire et tentatives d'ouverture intégré/Chrome | Aucun navigateur disponible ; pas de capture, contrôle responsive, lecteur d'écran ou certification visuelle |
| GitHub Actions réel | Exécution distante | Non exécutée : aucune publication/push demandée. La vérification locale du workflow ne constitue pas une validation réelle de la CI Linux |

L'environnement propre est un **export du candidat de travail** à partir des
fichiers suivis et des nouveaux fichiers non ignorés par Git. Il ne s'agit pas
d'un clone de HEAD : les corrections et le chantier précédent ne sont pas
commités. Aucun `.env` privé, `node_modules`, client Prisma généré ou ancien `dist`
n'a été copié. Les sources/tests applicatifs et les deux PNG ont été comparés
avec ceux de cet espace de travail : identiques. L'export est conservé dans un
répertoire temporaire `lucarne-clean-*` pour diagnostic.

Des échecs intermédiaires ont été traités, sans masquer les assertions :

- une erreur de type introduite dans un handler de test renvoyant Response a été
  corrigée en handler void ; une référence de méthode non liée dans un test a
  été remplacée par la référence du spy ; lint/types finaux passent ;
- une première suite locale a expiré en attendant l'écran de login ; le test
  ciblé puis la suite locale complète finale ont passé. Ce timeout n'est pas
  présenté comme un échec préexistant confirmé ;
- l'installation offline propre a échoué avec ENOTCACHED ; l'installation depuis
  le registre officiel a ensuite réussi, sans changement du lockfile ;
- le sandbox a refusé la lecture d'un parent pour esbuild dans TEMP ; le build
  propre a ensuite réussi avec l'exécution autorisée ;
- 24 tests MATCH propres échouaient : leurs mocks utilisaient `new URL(...)`
  sans base et dépendaient donc du `.env` local donnant une URL absolue. Ce
  défaut préexistant de simulation a été corrigé en résolvant aussi les chemins
  relatifs sur `window.location.origin`. Les assertions et l'application sont
  conservées ; les 31 tests MATCH ciblés passent avec et sans `.env` ;
- une passe Web propre a encore rencontré un timeout de 5 s sur le long parcours
  MATCH complet. Le dernier rejeu complet passe, sans augmentation de timeout,
  skip, modification des assertions ou assouplissement de la configuration.
  Une tentative d'option `--maxWorkers=2` via l'alias racine a été interprétée
  par le npm imbriqué comme option inconnue, et non transmise dans la commande
  Vitest affichée : cette réussite n'est donc pas présentée comme une preuve
  d'exécution à deux workers. Les timeouts intermittents restent à surveiller.

La revue finale a également reproduit une course entre deux réponses de login
résolues dans le même tour : la garde HTTP pouvait précéder l'écriture des deux
tokens. Le test échouait avant correction ; le service vérifie désormais la
révision immédiatement avant `setAccessToken`. Le test ciblé et les suites Web
complètes locales et propres passent après cette correction.

Au total, **1110 tests réussis localement** : 236 Shared + 207 API unitaires +
395 Web + 272 PostgreSQL, contre 1083 dans l'audit initial. Dans l'export propre,
les 838 tests sans base passent et la séquence de migration est validée sur sa
propre base vierge. Les 272 intégrations ont été exécutées depuis le workspace
sur une autre base isolée, pas dans l'export.

## Fichiers modifiés

Par rapport à l'instantané pris au début de cette passe : **26 fichiers
existants modifiés et 4 nouveaux fichiers**, dont ce bilan. S'y ajoutent deux
PNG existants rendus versionnables, sans changement de contenu. Ce décompte est
limité à cette intervention ; il n'englobe pas le chantier déjà présent.

Lots applicatifs et tests :

```text
apps/web/src/features/player/playerStyles.ts
apps/api/src/middlewares/loginRateLimit.ts
apps/api/src/middlewares/errorHandler.ts
apps/api/src/features/season/season.service.ts
apps/web/src/lib/authToken.ts
apps/web/src/lib/httpClient.ts
apps/web/src/lib/queryClient.ts
apps/web/src/lib/sessionRevision.ts                           nouveau
apps/web/src/services/auth.service.ts
apps/api/tests/unit/middlewares/loginRateLimit.test.ts
apps/api/tests/unit/middlewares/errorHandler.test.ts
apps/api/tests/unit/season/season.update-concurrency.test.ts   nouveau
apps/api/tests/integration/season/season.update.integration.test.ts
apps/web/tests/unit/lib/authToken.test.ts
apps/web/tests/unit/lib/httpClient.test.ts
apps/web/tests/unit/lib/session.transitions.test.ts            nouveau
apps/web/tests/integration/match/match.management.integration.test.tsx
apps/web/tests/integration/match/match.public.integration.test.tsx
```

Configuration, documentation et suivi :

```text
.gitignore
.github/workflows/check.yml
.github/CI.md
README.md
docs/ARCHITECTURE.md
apps/api/docs/CONVENTIONS.md
apps/api/docs/DATA_MODEL.md
apps/web/docs/CONVENTIONS.md
docs/features/participation-003-season-team-management.md
docs/decisions/0006-player-photo-storage.md
AUDIT-2026-10-06.md                           renvoi vers le suivi historique
AUDIT-2026-10-06-CORRECTIONS.md               nouveau bilan
```

Ressources existantes rendues versionnables, sans modification de leurs octets :

```text
apps/web/docs/images/logo-blanc-sans-fond.png
apps/web/docs/images/logo-sans-texte-blanc.png
```

Plusieurs documents locaux restent ignorés par Git selon les règles existantes ;
les corrections F10 y sont présentes dans le workspace. L'exception F03 est
limitée aux images et ne publie pas automatiquement l'ensemble des documents.
Les trois nouveaux fichiers applicatifs/tests et les PNG doivent être inclus
avec le reste du candidat lors du futur commit.

## 9 fichiers dans le bandeau, 17 dans l'audit

Le patch de l'audit initial contient **17 en-têtes `diff --git` distincts**,
correspondant exactement aux 17 fichiers source listés dans le rapport. Les
deux livrables Markdown/patch étaient en plus. Aujourd'hui, ces 17 fichiers se
répartissent en 10 suivis par Git et 7 non suivis ; le chiffre 9 n'est donc pas
non plus expliqué par cette simple distinction.

Le bandeau était un résumé incomplet ou incohérent avec le manifeste. Sa cause
précise ne peut pas être reconstituée à partir du dépôt ; il serait injustifié
d'affirmer que « 9 suivis + 8 nouveaux » l'explique. La référence vérifiable est
le manifeste du patch : 17 fichiers source pour la première passe. Les fichiers
de cette nouvelle passe sont listés séparément ci-dessus, en incluant les
documents et en distinguant les nouvelles sources des assets déjà existants.

## Points ouverts

1. F05 : choisir les origines d'images et préciser les domaines HTTPS si une
   liste est retenue ; adapter ensuite la CSP et tester les en-têtes/rendu de production.
2. F08 : confirmer le sens du compteur avant de filtrer ses deux calculs ; tester
   ensuite création, suppression et prévisualisation/détail, en conservant les archives.
3. F01 : contrôle visuel desktop/mobile en navigateur connecté restant à faire.
4. CI réelle : exécuter le candidat commité sur GitHub Actions ; les assets et
   nouvelles sources doivent être présents dans ce commit.
5. Dépendances : `npm ci` puis `npm audit --json` signalent 9 vulnérabilités,
   réparties en 2 modérées, 6 élevées et 1 critique. Le signal critique concerne
   proxy-addr. L'avis publié décrit une usurpation d'IP en présence de certaines
   configurations de sous-réseaux de confiance IPv6 ; le code relu n'active pas
   `trust proxy`, donc cette condition d'exploitation n'a pas été démontrée ici.
   [Avis du mainteneur proxy-addr](https://github.com/advisories/GHSA-jqcg-44mw-7w3h).
   Les autres paquets signalés sont @prisma/config, brace-expansion, deepmerge-ts,
   fast-uri, mysql2, prisma, qs et source-map-js. Certaines suggestions npm
   demandent un changement majeur de Prisma ; aucune correction automatique ou
   rétrogradation n'a été appliquée. Une passe dédiée doit vérifier applicabilité,
   versions corrigées et compatibilité.

Les questions de rétention/quota des photos, volumes de calendrier et readiness
restent distinctes des corrections réalisées. Aucune nouvelle règle sportive,
modification du modèle de données ou purge d'archives n'a été ajoutée.
