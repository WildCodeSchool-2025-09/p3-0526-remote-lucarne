# Vérifier le Web

Commandes depuis la racine, définies dans les [scripts](../../../package.json).
Sous PowerShell, `npm.cmd` remplace `npm` si la politique bloque `npm.ps1`.

| Besoin | Commande |
| --- | --- |
| Suite Web | `npm run test:web` |
| Couverture Web | `npm run test:web:coverage` |
| Formulaire ciblé | `npm run test:web -- tests/unit/league/components/UpdateLeagueForm.test.tsx` |
| Watch Web | `npm run test:watch --workspace=@lucarne/web` |
| Types Web | `npm run check-types --workspace=@lucarne/web` |
| Build Web | `npm run build --workspace=@lucarne/web` |

[vite.config.ts](../vite.config.ts) configure Vitest/jsdom et découvre
`tests/**/*.test.{ts,tsx}`, avec jest-dom dans [tests/setup.ts](../tests/setup.ts).
Les tests utilisent Testing Library et user-event. Les intégrations Web utilisent
un routeur mémoire, un QueryClient isolé et HTTP simulé ; ce ne sont pas des tests
de bout en bout avec API/PostgreSQL. Aucun runner E2E navigateur n'est configuré.

Choisir selon le changement : service → URL/payload/erreur ; hook → cache et
invalidation ; formulaire → validation, soumission et conservation après erreur ;
route → navigation et droits. Référence d'intégration :
[team.creation.integration.test.tsx](../tests/integration/team/team.creation.integration.test.tsx).
Les modifications visuelles demandent aussi la vérification manuelle ciblée décrite
dans [UI_GUIDELINES](UI_GUIDELINES.md), jsdom ne validant pas la mise en page réelle.

Pour shared, lint et validation globale, lire le [README](../../../README.md#commandes-principales).
Les configurations refusent zéro test et `only` ; ne pas contourner un échec avec
`skip`/`todo`. Une modification purement documentaire demande des contrôles de liens,
chemins et scripts, pas toute la suite applicative.
