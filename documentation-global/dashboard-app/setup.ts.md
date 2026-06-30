# setup.ts

**Chemin du fichier :** `app/src/test/setup.ts`

## Description

Fichier de configuration des tests Vitest. Importe les matchers DOM et mocke les APIs Tauri qui ne sont pas installées dans package.json.

## Composants/clés/fonctions/exportations

- **import `@testing-library/jest-dom/vitest`** — ajoute les matchers DOM (toBeInTheDocument, toHaveClass, etc.)
- **vi.mock("@tauri-apps/api/event")** — mock de `listen` (retourne une fonction de désabonnement)
- **vi.mock("@tauri-apps/plugin-notification")** — mock de `isPermissionGranted`, `requestPermission`, `sendNotification`
- **vi.mock("@tauri-apps/plugin-dialog")** — mock de `save` (retourne null par défaut)

## Dépendances

- `@testing-library/jest-dom/vitest` — matchers DOM pour Vitest
- `vitest` — `vi.mock`
- `@tauri-apps/api/event` — mocké
- `@tauri-apps/plugin-notification` — mocké
- `@tauri-apps/plugin-dialog` — mocké

## Détails importants

- Ce fichier est chargé automatiquement par Vitest avant chaque fichier de test (via `setupFiles` dans vite.config.ts).
- Les mocks sont nécessaires car les plugins Tauri ne fonctionnent que dans l'environnement Tauri natif.
- Les notifications sont mockées comme "accordées" par défaut pour faciliter les tests.
