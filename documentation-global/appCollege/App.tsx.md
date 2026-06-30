# App.tsx

## Chemin du fichier
`App.tsx`

## Description
Composant principal de l'application `appCollege`. Application tablette de gestion de passage à l'infirmerie d'un collège. Interface simplifiée en 2 étapes : saisie du nom puis du prénom, avec validation et envoi au serveur PC.

## Composants/clés principaux

### Composants internes
- **`Toast`** : Notification temporaire animée (succès/erreur/info)
- **`ErrorBoundary`** : Composant de classe capturant les erreurs React avec bouton de relance

### Composant principal
- **`App`** : Composant fonctionnel principal

### Export principal
- **`AppAvecBoundary`** (default export) : `App` enveloppé dans `ErrorBoundary`

### États principaux
- `screen` : Écran actif (`'main'` ou `'settings'`)
- `nom`, `prenom` : Champs du formulaire
- `pcConnecte` : État de connexion au PC
- `ipPC` : IP du PC connecté
- `file` : File d'attente d'envoi
- `historique` : Historique des passages
- `fileSuppression` : File d'attente de suppressions serveur
- `toast` : État du toast de notification
- `latence` : Latence de connexion

### Fonctionnalités
- **Formulaire 2 étapes** : Nom puis Prénom, bouton VALIDER conditionnel
- **Bouton rond** : Indicateur visuel de connexion (vert/rouge), 6 taps = paramètres
- **File d'attente** : Envoi différé si PC injoignable, traitement automatique
- **Reconnexion** : Backoff exponentiel, reset au retour en foreground
- **Historique** : 50 derniers passages avec statut (envoyé/en attente/erreur)
- **Vibrations** : Succès (60ms), erreur (3x120ms)
- **Toast** : Notification animée disparaissant après 2s

## Dépendances
- `react` : useState, useEffect, useRef, useCallback, React
- `react-native` : Text, TextInput, View, TouchableOpacity, StatusBar, Vibration, AppState, Animated, KeyboardAvoidingView, Platform
- `react-native-safe-area-context` : SafeAreaView
- `./theme` : useTheme
- `./styles` : createStyles
- `./ApiService` : envoyerScan, testerConnexion, setIP, getApiBaseUrl, resolveBaseUrl, getIP, initDeviceIP, isConnecte, getBackoffMs, onConnectionChange, resetBackoff, supprimerToutServeur, supprimerParType
- `./StorageService` : loadIP, loadQueue, loadHistory, saveQueue, saveHistory, clearHistory, clearQueue, loadDeleteQueue, saveDeleteQueue, clearDeleteQueue, generateId, HistoryEntry, QueueEntry, DeleteQueueEntry
- `./Logger` : logInfo, logError, logFatal, startLogFlusher, installGlobalErrorHandler, clearLogsLocaux
- `./SettingsScreen` : SettingsScreen
- `./package.json` : version

## Détails importants
- **Init au démarrage** : Charge IP sauvegardée, résout l'URL active, restaure files et historique
- **Queue traitement** : Intervalle de 3 secondes pour traiter les files d'attente
- **Foreground/Background** : Reset du backoff et reconnexion au retour en foreground, clear des logs en background
- **Validation** : Protection contre les doubles validations via ref `validationEnCours`
- **Nom en majuscules** : Le nom de famille est automatiquement mis en majuscules
- **KeyboardAvoidingView** : Adapte le comportement selon la plateforme (iOS padding, Android height)
- **Log flusher** : Démarre avec un intervalle de 3 secondes
- **Error handler global** : Installé au chargement du module
