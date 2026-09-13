# Décisions techniques

Créer un document seulement pour un choix important : frontière de responsabilité,
contrat incompatible, persistance ou dépendance structurante. Les choix locaux
évidents restent dans le code ou la fiche de fonctionnalité.

Nommer les nouvelles décisions `NNNN-short-title.md`, avec le prochain numéro
disponible. Lier la fiche concernée ; ne pas reconstruire un historique supposé.
Une proposition ne devient acceptée qu'après validation explicite. Conserver une
décision remplacée et lier celle qui la remplace.

## Modèle à copier

```markdown
# NNNN — Titre

Date : YYYY-MM-DD
Statut : proposée / acceptée / remplacée
Validation : à préciser
Fiche ou décision liée : chemin relatif

## Contexte
Problème concret, contraintes vérifiées et options pertinentes.

## Décision
Choix, périmètre et justification ; identifier ce qui reste à valider.

## Conséquences
Effets sur API/Web/données, compromis, compatibilité, migration et vérifications.
```
