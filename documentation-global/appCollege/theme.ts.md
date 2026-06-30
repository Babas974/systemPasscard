# theme.ts

## Chemin du fichier
`theme.ts`

## Description
Système de thèmes adaptatifs supportant le mode clair et le mode sombre d'Android. Fournit une interface `Theme` standardisée et un hook `useTheme` pour détecter automatiquement le schéma de couleurs du système.

## Composants/clés principaux
- **`Theme`** (interface) : Définit toutes les couleurs utilisées dans l'application (background, card, text, primary, error, success, warning, modal, radio buttons, historique, badge, etc.)
- **`lightTheme`** (constante `Theme`) : Thème clair avec des bleus et blancs
- **`darkTheme`** (constante `Theme`) : Thème sombre avec des nuances de slate
- **`useTheme()`** (fonction) : Hook personnalisé utilisant `useColorScheme()` de React Native pour retourner le thème approprié selon le mode système

## Dépendances
- `react-native` : `useColorScheme`

## Détails importants
- Le type `statusBar` est `'light-content' | 'dark-content'` pour contrôler la couleur de la barre d'état
- Le thème contient des couleurs dédiées pour les radio buttons, la console de debug, les modals et l'historique
- Utilisé dans tous les composants via le hook `useTheme()` pour assurer la cohérence visuelle
