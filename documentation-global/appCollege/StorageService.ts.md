# StorageService.ts

## Chemin du fichier
`StorageService.ts`

## Description
Service de persistance locale basé sur AsyncStorage. Fournit un wrapper résistant aux erreurs avec fallback en mémoire lorsque le module natif n'est pas disponible (par ex. pendant le développement sans build natif).

## Composants/clés principaux

### Interfaces
- **`QueueEntry`** : `{ id, contenu, creeLe }` — entrée de la file d'attente
- **`HistoryEntry`** (extends QueueEntry) : Ajoute `statut`, `envoyeLe`, `erreur`
- **`DeleteQueueEntry`** : `{ id, type, creeLe }` — file d'attente de suppressions serveur
- **`LogEntryPersist`** : `{ source, niveau, message, timestamp, envoye }` — log persisté

### Constantes
- **`DEFAULT_IP`** : IP par défaut (vide)
- **`HISTORY_LIMIT`** : 50 (limite d'entrées historique)

### Fonctions exportées
- **`loadIP()` / `saveIP(ip)`** : Chargement/sauvegarde de l'IP du PC
- **`loadPort()` / `savePort(port)`** : Chargement/sauvegarde du port
- **`loadQueue()` / `saveQueue(queue)` / `clearQueue()`** : Gestion de la file d'attente
- **`loadHistory()` / `saveHistory(history)` / `clearHistory()`** : Gestion de l'historique
- **`loadDeleteQueue()` / `saveDeleteQueue(queue)` / `clearDeleteQueue()`** : File d'attente de suppressions
- **`loadLogs()` / `saveLogs(logs)` / `clearLogs()`** : Persistance des logs
- **`generateId()`** : Génère un ID unique basé sur timestamp + aléatoire
- **`isStoragePersistant()`** : Indique si le stockage natif est disponible

## Dépendances
- `./Logger` : `logWarn`, `logError`

## Détails importants
- **Fallback mémoire** : Si AsyncStorage n'est pas disponible, les données sont stockées en mémoire (disparaissent au restart)
- **require dynamique** : Utilise `require()` au lieu de `import` pour éviter les crashes si le module natif est absent (l'import ES est hoisted)
- **Gestion d'erreurs robuste** : Chaque opération est enveloppée dans un try/catch avec fallback
- **Debounce persist** : Les logs sont persistés avec un debounce de 2 secondes
- **Limite de 500 logs** : `saveLogs` tronque à 500 entrées
- **Clés de stockage** : Préfixées avec `@appCollege/` pour éviter les conflits
