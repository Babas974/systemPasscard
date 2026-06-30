# default.json

**Chemin du fichier :** `app/src-tauri/capabilities/default.json`

## Description

Configuration des permissions (capabilities) pour la fenêtre principale de l'application Tauri. Définit les droits d'accès accordés au frontend.

## Composants/clés/fonctions/exportations

- **identifier** : `"default"` — identifiant de cette capability
- **description** : `"Capability for the main window"`
- **windows** : `["main"]` — s'applique à la fenêtre principale
- **permissions** :
  - `core:default` — permissions de base Tauri
  - `core:event:default` — permissions d'écoute d'events
  - `opener:allow-open-path` — autorise l'ouverture de fichiers
  - `opener:allow-open-url` — autorise l'ouverture d'URLs
  - `notification:default` — permissions de notifications
  - `dialog:default` — permissions de boîtes de dialogue

## Dépendances

Aucune (fichier de configuration JSON).

## Détails importants

- **Sécurité** : seules les permissions nécessaires sont accordées (principe du moindre privilège).
- Les permissions `opener` sont nécessaires pour l'export CSV (ouverture du dossier).
- Les permissions `notification` sont nécessaires pour les notifications natives.
- Les permissions `dialog` sont nécessaires pour la boîte de dialogue de sauvegarde CSV.
