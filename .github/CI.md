# CI/CD

La CI s'exécute sur chaque pull request vers `develop`, `dev`, `main` ou
`staging`, ainsi que sur les push vers `staging`. Elle installe le lockfile avec
`npm ci`, génère Prisma, valide le schéma et l'état des migrations, puis exécute
lint, typecheck, les tests shared/API/web/intégration PostgreSQL, le build et
`git diff --check`.

Les intégrations utilisent uniquement le service PostgreSQL éphémère
`lucarne_test`. Les URL de développement et de test sont volontairement
distinctes. Les migrations sont appliquées à ce service avant les tests ; aucune
base externe n'est ciblée.

Le déploiement staging est déclenché par la fin réussie de `CI`, uniquement pour
un push sur `staging`. Il transmet le SHA validé au script VPS externe
`traefik/deploy/js-project.sh`; ce script n'est pas versionné dans ce dépôt et
doit garantir qu'il déploie exactement ce SHA. Les secrets SSH ne sont exposés
qu'au job de déploiement. `DEPLOY_URL` est une variable d'environnement GitHub
non secrète utilisée pour les smoke tests API (`/api/v1/health`) et web.

La protection de branche GitHub doit rendre le check `CI / Validate` obligatoire
avant fusion. Les environnements GitHub doivent protéger `staging` selon les
règles de l'organisation.
