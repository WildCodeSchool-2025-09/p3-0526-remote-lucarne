# Conventions Web

## Nommage et composition

Composants/pages `.tsx` en PascalCase (`LeagueDetailPage`, `UpdateLeagueForm`),
hooks `useX`, services `<domain>.service.ts`, schémas `<domain>.schema.ts`.
Les pages composent navigation, droits et données ; les formulaires reçoivent
données et callbacks. Suivre les exports du voisin : pages souvent par défaut,
composants UI via [src/ui/index.ts](../src/ui/index.ts). Le lint partagé fait
autorité pour le style ; aucun formateur séparé n'est installé.

## Formulaires

[UpdateLeagueForm](../src/features/league/components/UpdateLeagueForm.tsx) utilise
React Hook Form, `zodResolver`, valeurs initiales, champs modifiés, erreurs par champ
et état de mutation. L'[adaptateur League](../src/schemas/league.schema.ts) transforme
les valeurs UI vers le contrat partagé ; ne pas dupliquer les règles Zod serveur.
Il distingue absence de modification et effacement du logo, et transmet `version`.

Conserver la saisie après erreur, désactiver la soumission en cours, afficher
les erreurs de champ et le message global approprié. Pour un conflit de version,
la pratique League/Player est de proposer un rechargement explicite. Adapter cette
gestion au contrat du domaine, sans ajouter un versionnement à Team par analogie.

## HTTP, erreurs et session

Les [services](../src/services) appellent [httpClient](../src/lib/httpClient.ts)
avec des chemins comme `/leagues` ; il compose l'URL versionnée, JSON, tableaux
de query, Bearer, réponses 204 et `HttpError` (`status`, `code`, `details`).
Les détails de validation peuvent contenir un préfixe `body.` : examiner les
adaptateurs d'erreur de la feature avant de les associer aux champs.

[authToken](../src/lib/authToken.ts) stocke le token dans `sessionStorage` et vide
le cache lors de sa suppression. Un HTTP 401 efface la session et émet
`lucarne:session-expired`, traité dans App. Les rôles lus du JWT par
[authRole](../src/auth/authRole.ts) orientent [RequireRole](../src/auth/RequireRole.tsx)
et les actions affichées ; ils ne remplacent pas les contrôles serveur.

Pour l'URL API, CORS et les variables exposées au navigateur, lire le
[README](../../../README.md#communication-et-environnement).
