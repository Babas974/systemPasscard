# package.json

## Chemin du fichier
`package.json`

## Description
Manifeste NPM du projet `appCollege`. Définit les métadonnées du projet, les scripts, les dépendances et les configurations d'exécution.

## Composants/clés principaux
- **name** : `app`
- **version** : `0.0.2`
- **private** : `true`
- **engines** : Node.js >= 22.11.0

### Scripts
- `android` : Lance l'app Android via `react-native run-android`
- `ios` : Lance l'app iOS via `react-native run-ios`
- `lint` : Exécute ESLint
- `start` : Démarre le bundler Metro
- `test` : Lance les tests Jest

### Dépendances principales
- `react` : 19.2.3
- `react-native` : 0.85.3
- `@react-native-async-storage/async-storage` : ^2.2.0
- `react-native-camera-kit` : ^14.1.0
- `react-native-safe-area-context` : ^5.5.2
- `@react-native/new-app-screen` : 0.85.3

### DevDependencies
- TypeScript, ESLint, Jest, Prettier
- Outils React Native (Babel, Metro, Jest presets)

## Dépendances
Aucune (fichier de configuration racine)

## Détails importants
- Utilise React 19 et React Native 0.85.3
- La caméra (`react-native-camera-kit`) est utilisée pour le scan de QR codes
- AsyncStorage est utilisé pour la persistance locale (IP, queue, historique, logs)
