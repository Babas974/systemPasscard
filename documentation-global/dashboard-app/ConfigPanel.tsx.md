# ConfigPanel.tsx

**Chemin du fichier :** `app/src/ConfigPanel.tsx`

## Description

Panneau de configuration pour l'administrateur non-technique. Permet de visualiser l'état du serveur, modifier le port, relancer le serveur et supprimer les anciens logs.

## Composants/clés/fonctions/exportations

### Interfaces
- **Props** — propriétés du composant : `{ ouvert, surFermer }`

### Constantes
- **styles** — objet contenant tous les styles CSS inline du composant

### Composant
- **ConfigPanel** — composant principal exporté par défaut
  - États : `port`, `nouveauPort`, `statutServeur`, `message`
  - Effets : chargement initial + polling toutes les 5 secondes
  - Actions :
    - `chargerConfig` — récupère le port et vérifie l'état du serveur
    - `handleChangerPort` — modifie le port (1024-65535) et sauvegarde en config
    - `handleRelancer` — relance le serveur HTTP
    - `handleViderAnciensLogs` — supprime les fichiers logs antérieurs à hier
  - Rendu : panneau latéral droit (400px) avec sections : état, port, actions rapides, messages

## Dépendances

- `react` — hooks (useState, useEffect, useCallback)
- `@tauri-apps/api/core` — `invoke`

## Détails importants

- **Validation du port** : doit être entre 1024 et 65535.
- **Sauvegarde config** : le port est sauvegardé dans `~/.config/appcollege/config.json`.
- **Health check** : utilise `/debug/logs?limit=1` plutôt que `/health` pour vérifier l'état du serveur.
- **Messages utilisateur** : affiche des messages de succès ou d'erreur après chaque action.
- Le panneau est distinct du DebugPanel et ne s'affiche que quand `debugSecret` est activé (5 taps sur le titre).
