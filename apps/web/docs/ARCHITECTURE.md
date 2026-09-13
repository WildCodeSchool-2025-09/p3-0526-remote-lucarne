# Architecture Web

[main.tsx](../src/main.tsx) installe StrictMode, QueryClientProvider, RouterProvider
et le CSS global. [App.tsx](../src/App.tsx) fournit l'en-tête, le contenu via Outlet
et la navigation après expiration de session. [router.tsx](../src/router.tsx)
déclare les pages et gardes, l'erreur de route et la page inconnue.

## Emplacements

- `src/features/league`, `team`, `player` : pages et composants métier ; les fichiers
  `*Keys.ts` définissent les clés de cache. Certains domaines ont leurs hooks et utilitaires locaux.
- `src/pages` : pages transversales ; `dev/login` n'est routé qu'en développement.
- `src/hooks` : hooks métier déjà présents ; conserver cette organisation mixte
  et suivre les voisins sans déplacer les hooks existants.
- `src/services` : fonctions HTTP par domaine ; `src/schemas` : adaptation de formulaire.
- `src/lib` : transport, jeton de session et QueryClient ; `src/auth` : lecture du rôle et garde UI.
- `src/ui`, `src/styles/global.css` : composants transversaux et styles.

## Données et état

Les pages consomment des hooks TanStack Query ; les services utilisent
[httpClient](../src/lib/httpClient.ts). Le cache serveur est centralisé dans
[queryClient](../src/lib/queryClient.ts), avec fraîcheur de 30 secondes et un retry
pour les lectures. L'état de formulaire relève de React Hook Form et l'état local
d'interaction de React ; les filtres de ligues sont synchronisés avec l'URL.

[useUpdateLeague](../src/hooks/useUpdateLeague.ts) illustre la mise à jour du détail
puis l'invalidation du détail, des listes et des pays après succès, sans retry de mutation.
Examiner les clés du domaine pour couvrir ses propres vues dépendantes.

Pour une nouvelle page, placer le composant dans sa feature, raccorder le routeur
et les rôles, puis service/hook et schéma si nécessaires. Lire
[CONVENTIONS](CONVENTIONS.md) pour le transport et les formulaires,
[UI_GUIDELINES](UI_GUIDELINES.md) pour le rendu. Les écarts `/dashboard`/`/admin`
sont décrits dans l'[architecture commune](../../../docs/ARCHITECTURE.md#écarts-et-points-à-préciser).
