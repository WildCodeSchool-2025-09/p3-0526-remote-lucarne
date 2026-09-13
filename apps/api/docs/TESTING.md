# Vérifier l'API

Commandes depuis la racine. Les [scripts API](../package.json) et les
[alias racine](../../../package.json) font autorité ; utiliser npm.cmd sous
PowerShell si npm.ps1 est bloqué.

| Besoin | Commande |
| --- | --- |
| Unitaires et HTTP sans PostgreSQL | `npm run test:api` |
| Couverture | `npm run test:api:coverage` |
| Watch | `npm run test:api:watch` |
| Test ciblé mot de passe | `npm run test:api -- tests/unit/auth/password.test.ts` |
| Intégration PostgreSQL | `npm run test:api:integration` |
| Types API | `npm run check-types --workspace=@lucarne/api` |

[vitest.config.ts](../vitest.config.ts) découvre tests/unit/**/*.test.ts et exclut
les fichiers d'intégration ; Vitest et Supertest testent services, repositories
simulés, middleware et application importée sans démarrer server.ts. Supertest peut
ouvrir un port éphémère. [vitest.setup.ts](../vitest.setup.ts) configure l'environnement.

[vitest.integration.config.ts](../vitest.integration.config.ts) sélectionne
les fichiers tests/integration/**/*.integration.test.ts, sans parallélisme de fichiers.
Le [setup](../tests/setup/integration.setup.ts) nettoie avant chaque test et ferme
les clients ensuite. Les routes protégées, contraintes SQL, concurrence et migrations
nécessitent ces tests ; référence :
[player.team-player.integration.test.ts](../tests/integration/player/player.team-player.integration.test.ts).

Choisir les tests selon le changement : service → règles/erreurs ; middleware →
statut et payload ; route protégée → absence de session, rôles et succès ;
écriture → absence d'effet après validation échouée, conflit ou contrainte.
Pour un schéma partagé, ajouter les vérifications shared indiquées dans le
[README](../../../README.md#commandes-principales).

Les configurations refusent zéro test et only. Ne pas masquer un échec par skip/todo.
Une modification documentaire demande la vérification des liens et commandes,
sans exécution systématique de la suite applicative.

## Base de données de test

Le profil Compose `test` démarre une instance PostgreSQL séparée nommée
`db_test`. Elle utilise la base `lucarne_test`, le port local `5436` et le volume
nommé `postgres_test_data`. Utiliser exclusivement cette base dédiée pour
les tests d'intégration : leur préparation vide les tables applicatives,
tout en conservant `_prisma_migrations`.

Pour démarrer et contrôler la base de test :

```bash
docker compose --profile test up -d db_test
docker compose --profile test ps db_test
```

Dans PowerShell, appliquer les migrations Prisma à la base de test puis exécuter
les tests :

```powershell
$previousDatabaseUrl = $env:DATABASE_URL
try {
  $env:DATABASE_URL = "postgresql://test_user:test_password@localhost:5436/lucarne_test"
  npm run db:migrate
  if ($LASTEXITCODE -ne 0) { throw "Test database migration failed" }
} finally {
  if ($null -eq $previousDatabaseUrl) {
    Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
  } else {
    $env:DATABASE_URL = $previousDatabaseUrl
  }
}
npm run test:api:integration
```

Prisma CLI utilise `DATABASE_URL` pour les migrations. Les tests utilisent
`TEST_DATABASE_URL`, définie par défaut dans `apps/api/vitest.setup.ts`.
Ces deux URL doivent être distinctes lors de l'exécution des tests. Si les
identifiants ou le port Docker sont personnalisés, adapter l'URL de migration
et `TEST_DATABASE_URL` avant de lancer les tests.

Lorsque les tests sont terminés, arrêter l'instance dédiée sans supprimer son
volume :

```bash
docker compose --profile test stop db_test
```

Le validateur [environment.ts](../src/config/environment.ts) exige en outre un nom
commençant par lucarne_test (suivi de la fin du nom ou d'un underscore).
Le nettoyage est destructif pour les tables applicatives de cette base dédiée.
