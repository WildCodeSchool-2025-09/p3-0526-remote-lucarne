# Web — point d'entrée

Responsabilité : parcours, rendu, formulaires et cache des données serveur.
Réutiliser `src/ui`, les services HTTP et les hooks du domaine concerné.

Lire selon la tâche :

- [Architecture](docs/ARCHITECTURE.md) pour pages, navigation, état ou accès aux données ;
- [Conventions](docs/CONVENTIONS.md) pour composants, formulaires, erreurs ou appels API ;
- [UI](docs/UI_GUIDELINES.md) pour styles, responsive, accessibilité ou états d'écran ;
- [Tests](docs/TESTING.md) pour sélectionner les vérifications ;
- [Environnement](.env.sample) et [README](../../README.md#communication-et-environnement) pour configurer l'URL API et distinguer variables publiques et secrets.

Les gardes Web servent à l'interface ; les autorisations sont contrôlées par l'API.
