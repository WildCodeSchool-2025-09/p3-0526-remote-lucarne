# API — point d'entrée

Responsabilité : contrat HTTP, validation serveur, droits, règles métier et persistance.
Suivre la feature voisine dans `src/features`, avec Prisma centralisé dans `database`.

Lire selon la tâche :

- [Architecture](docs/ARCHITECTURE.md) pour ajouter une route ou modifier une couche ;
- [Conventions](docs/CONVENTIONS.md) pour validation, erreurs, authentification ou permissions ;
- [Modèle de données](docs/DATA_MODEL.md) pour requêtes, relations, contraintes, migrations ou seeds ;
- [Tests](docs/TESTING.md) pour choisir les vérifications et préparer PostgreSQL de test ;
- [Environnement](.env.example) et [validateur](src/config/environment.ts) pour configurer le serveur ; installation dans le [README](../../README.md).

Ne pas exposer les modèles Prisma comme contrats Web ; utiliser `@lucarne/shared`.
