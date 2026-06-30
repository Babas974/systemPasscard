# SettingsScreen.tsx

## Chemin du fichier
`SettingsScreen.tsx`

## Description
Page de paramètres de l'application. Accessible en tapant 6 fois sur le bouton rond de connexion. Permet de gérer la console de debug, tester la connexion, vider l'historique, exporter les logs et voir l'historique des élèves.

## Composants/clés principaux

### Composant principal
- **`SettingsScreen`** (composant fonctionnel) : Page de paramètres complète

### Props
- `theme` : Thème actif
- `version` : Version de l'application
- `ipActuelle` : IP actuellement connectée
- `pcConnecte` : État de la connexion au PC
- `onClose` : Callback de fermeture
- `onViderHistorique` : Callback pour vider l'historique
- `onTesterConnexion` : Callback pour tester la connexion
- `historique` : Liste des passages enregistrés
- `fileSuppression` : File d'attente de suppressions serveur

### Fonctionnalités
- **Debug console** : Affiche les logs locaux avec niveaux colorisés (DEBUG, INFO, WARN, ERROR, FATAL)
- **Test de connexion** : Teste la connectivité au PC serveur
- **Vider l'historique** : Supprime l'historique local avec confirmation
- **Exporter les logs** : Génère un fichier .log via le module natif et le partage
- **Historique des élèves** : Liste scrollable des scans avec heure et contenu

### Constantes
- **`COULEURS_NIVEAU`** : Map des couleurs par niveau de log

## Dépendances
- `react`, `react-native` (View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, NativeModules)
- `react-native-safe-area-context` : `SafeAreaView`
- `./theme` : `Theme`
- `./styles` : `createStyles`
- `./ApiService` : `getApiBaseUrl`, `formatLocalDateTime`
- `./StorageService` : `HistoryEntry`, `DeleteQueueEntry`
- `./Logger` : `getLogsLocaux`, `getNbErreursLocales`
- Module natif : `NetworkModule` (pour `getCurrentLogFile` et `shareLogFile`)

## Détails importants
- Les logs sont rafraîchis toutes les 2 secondes quand la console est ouverte
- L'export de logs utilise un `FileProvider` natif pour partager le fichier
- La suppression d'historique inclut une suppression serveur avec file d'attente de fallback
