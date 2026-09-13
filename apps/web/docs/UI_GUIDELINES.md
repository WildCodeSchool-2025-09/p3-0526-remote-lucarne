# UI : références et pratiques constatées

## Composants et styles à réutiliser

[src/ui](../src/ui) expose Button, Input, Checkbox, FormField, Alert, AlertModal
et ConfirmDialog. [UiDemoPage](../src/pages/UiDemoPage.tsx), accessible à `/ui-demo`,
présente les variantes existantes. Consulter les props réelles avant d'ajouter une variante.

[global.css](../src/styles/global.css) importe Tailwind 4 et contient les tokens CSS
de couleur/rayon ainsi que les classes `lucarne-*` et les classes métier de type BEM.
Le code repose largement sur ces classes CSS ; la présence de Tailwind ne signifie
pas que chaque écran doit être réécrit en utilitaires. Réutiliser les tokens existants.

## Responsive constaté

Le CSS utilise flex/grid, largeur maximale de contenu, filtres repliables et
une media query à 600 px. Les tableaux de ligues deviennent des lignes empilées
avec `data-label` sur petit écran. Pour modifier ces écrans, vérifier largeur
étroite/large, textes longs, actions et débordements ; ne pas inventer une nouvelle
grille de breakpoints comme si elle était déjà établie.

## Accessibilité constatée et limites

FormField associe label et champ, fournit un ID d'erreur et `role="alert"` ; Input
expose `aria-invalid`. Le lien `aria-describedby` vers l'erreur n'est pas ajouté
automatiquement par ces composants. ConfirmDialog gère focus, retour du focus,
Escape et boucle Tab pour ses boutons. AlertModal n'offre pas les mêmes mécanismes.
Le CSS comporte `:focus-visible` et `.sr-only` ; cela ne constitue pas un audit complet.

Aucun niveau WCAG, matrice de navigateurs ni règle responsive formelle n'a été
trouvé dans la documentation initiale. Ce sont des exigences à préciser, distinctes
des pratiques du code. Lors d'un changement UI, vérifier labels, navigation clavier,
focus et annonces des erreurs du parcours touché.

## États d'écran

Les [pages League](../src/features/league/pages) et leurs formulaires montrent
chargement, absence de résultats, erreur/retry, ressource absente, mutation en cours,
conflit et retour après succès. Les gardes présentent l'absence de session ou de droits.
Réutiliser ces traitements selon le parcours ; un succès peut se traduire par
navigation et données rafraîchies, pas nécessairement par une notification.

La [fiche LEAGUE-011](../../../docs/league-011-business-rules.md) contient des exigences
documentées de conservation des saisies, de conflit et d'invalidation pour cette US.
La lire uniquement si l'édition des ligues est concernée ; ne pas transformer ses
anciennes hypothèses en politique UI générale. Vérifications : [TESTING](TESTING.md).
