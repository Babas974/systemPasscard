# Guide du Mode Débug

## Activation

Dans `debugConfig.ts`, modifier la variable :

```typescript
export const DEBUG_MODE = true;  // activer
export const DEBUG_MODE = false; // désactiver (production)
```

Aucun changement dans l'interface visible — le mode débug est invisible de l'extérieur.

---

## Accéder à l'écran de debug

Dans l'app, faire un **long press** sur le titre **"Passage à l'infirmerie"**. L'écran de debug s'affiche.

Appuyer sur **← Retour** pour revenir au formulaire.

> Le long press ne fonctionne que si `DEBUG_MODE = true`.

---

## Fonctionnalités de l'écran de debug

| Fonction | Description |
|----------|-------------|
| **Logs en temps réel** | Toutes les actions (JS + Kotlin) s'affichent instantanément |
| **Couleurs par niveau** | 🔵 DEBUG, 🟢 INFO, 🟡 WARN, 🔴 ERROR |
| **Filtres** | Appuyer sur un bouton de niveau pour masquer/afficher |
| **Auto-scroll** | Désactiver pour fouiller dans l'historique sans que ça défile |
| **Vider** | Effacer tous les logs en mémoire |
| **Sauvegarder** | Écrire les logs dans un fichier persistant sur l'appareil |

---

## Niveaux de log

| Niveau | Couleur | Quand |
|--------|---------|-------|
| `DEBUG` | Bleu foncé | Détails techniques (tampon, index, données brutes) |
| `INFO` | Vert foncé | Actions réussies (envoi, connexion, permissions) |
| `WARN` | Jaune/Orange | Avertissements (fermeture socket lente, etc.) |
| `ERROR` | Rouge | Échecs (Bluetooth coupé, envoi raté) |

---

## Sources des logs

| Source | Origine |
|--------|---------|
| `JS` | Code React Native (App.tsx, DebugLogger) |
| `KOTLIN` | Module natif Bluetooth (BluetoothModule.kt) |
| `SYSTEM` | Le logger lui-même (effacement, erreurs internes) |

---

## Voir les logs sans l'écran de debug

### Console Metro (terminal)
Les logs passent aussi par `console.log` en mode dev :
```bash
npx react-native start
```

### ADB Logcat (Android)
```bash
# Logs Bluetooth uniquement
adb logcat -s BluetoothModule

# Tous les logs de l'app
adb logcat | grep -i "appcollege\|BluetoothModule\|ReactNativeJS"
```

### Fichier de logs persistant
Dans l'écran de debug → bouton **"Sauvegarder"**.

Le fichier est créé dans le répertoire interne de l'app :
```
/data/data/com.appcollege/files/debug_logs_YYYYMMDD_HHMMSS.txt
```

Pour le récupérer sur ton PC :
```bash
adb shell run-as com.appcollege cat files/debug_logs_*.txt
```

Pour le copier sur ton PC :
```bash
adb shell run-as com.appcollege cat files/debug_logs_*.txt > logs_recuperes.txt
```

---

## Structure d'un log

Chaque log contient :
- **Timestamp** — `HH:MM:SS.mmm`
- **Niveau** — `DEBUG`, `INFO`, `WARN`, `ERROR`
- **Source** — `JS`, `KOTLIN`, `SYSTEM`
- **Tag** — le module d'origine (`App`, `BluetoothModule`, `DebugLogger`)
- **Message** — description de l'événement
- **Data** (optionnel) — objet JSON avec les détails

Exemple :
```
[14:32:05.123] [JS] [INFO] [App] Envoi de données
  nom: DUPONT
  prenom: Léa
  ligneCSV: DUPONT;Léa;2026-05-29T14:32:05.123Z
```

---

## Architecture technique

```
debugConfig.ts          ← Boolean + enums + couleurs
DebugLogger.ts          ← Singleton centralisé (mémoire + fichier)
DebugScreen.tsx         ← UI de debug (filtres, couleurs, actions)
BluetoothModule.kt      ← Event emitter Kotlin→JS + écriture fichier
App.tsx                 ← Intégration du logger dans le workflow
```

### Flux des logs

```
BluetoothModule.kt                App.tsx
       │                             │
       │ envoyerLogDebug()           │ DebugLogger.info()
       │                             │
       ▼                             ▼
  RCTDeviceEventEmitter        DebugLogger.ts
       │                             │
       └──────────┬──────────────────┘
                  ▼
           Logs en mémoire
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
  DebugScreen  console.log  Fichier
```

---

## Ajouter des logs dans le code

### Côté JavaScript/TypeScript
```typescript
import { DebugLogger } from './DebugLogger';

DebugLogger.debug('MonTag', 'Description', { donnee: 'optionnelle' });
DebugLogger.info('MonTag', 'Action réussie');
DebugLogger.warn('MonTag', 'Attention');
DebugLogger.error('MonTag', 'Erreur', { detail: erreur });
```

### Côté Kotlin
Les logs sont automatiquement envoyés via `envoyerLogDebug()`. Utiliser :
```kotlin
envoyerLogDebug("INFO", "MonModule", "Message ici")
envoyerLogDebug("ERROR", "MonModule", "Erreur ici", objetData)
```

---

## Désactiver complètement

Mettre `DEBUG_MODE = false` dans `debugConfig.ts` :
- Aucun log n'est stocké en mémoire
- L'écran de debug est inaccessible
- Zéro impact sur les performances
- Le code de debug reste dans la build mais ne s'exécute pas
