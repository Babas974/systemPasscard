# Documentation de Maintenance — LOGI-INFIRMERIE

## Table des matières

1. [Vue d'ensemble du projet](#1-vue-densemble-du-projet)
2. [Arborescence des fichiers](#2-arborescence-des-fichiers)
3. [Fichiers et leur rôle](#3-fichiers-et-leur-rôle)
4. [Cas de maintenance courants](#4-cas-de-maintenance-courants)
5. [Commandes de développement](#5-commandes-de-développement)
6. [Compiler et installer l'APK](#6-compiler-et-installer-lapk)
7. [Dépannage Bluetooth](#7-dépannage-bluetooth)

---

## 1. Vue d'ensemble du projet

LOGI-INFIRMERIE est une application Android installée sur une tablette à l'entrée de l'infirmerie. Un élève saisit son nom et prénom, clique sur Valider, et la donnée est envoyée directement au PC de l'infirmière via Bluetooth (sans Wi-Fi, sans internet).

**Stack technique :**
- Interface : React Native + TypeScript
- Logique Bluetooth : Module natif Kotlin
- Réception PC : dashboard HTML (étape 2, pas encore développée)

---

## 2. Arborescence des fichiers

```
appCollege/
│
├── App.tsx                         -- Interface utilisateur principale
├── styles.ts                       -- Tous les styles visuels de l'app
├── index.js                        -- Point d'entrée React Native (ne pas toucher)
│
└── android/
    └── app/
        └── src/
            └── main/
                ├── AndroidManifest.xml                  -- Permissions de l'app
                └── java/
                    └── com/
                        └── appcollege/
                            ├── BluetoothModule.kt       -- Logique Bluetooth
                            ├── BluetoothPackage.kt      -- Enregistrement du module
                            ├── MainApplication.kt       -- Déclaration des modules
                            └── MainActivity.kt          -- Activité Android (ne pas toucher)
```

---

## 3. Fichiers et leur rôle

---

### `App.tsx`
**Chemin :** `appCollege/App.tsx`

**Rôle :** C'est l'interface que voit l'élève. Il contient les champs Nom et Prénom, le bouton Valider, et les messages de retour (succès, erreur).

**Ce qu'il fait au lancement :**
- Demande les permissions Bluetooth à l'élève (une seule fois sur Android 12+)

**Ce qu'il fait au clic sur Valider :**
1. Vérifie que les deux champs sont remplis
2. Formate la ligne CSV : `NOM;Prenom;2026-05-22T12:34:56.789Z`
3. Appelle `BluetoothModule.envoyerDonneesPC(ligneCSV)` (le module Kotlin)
4. Affiche le bon message selon la réponse du Kotlin

**Quand le modifier :**
- Changer le texte affiché à l'élève (titre, sous-titre, placeholder, messages)
- Ajouter ou supprimer un champ de saisie
- Modifier le format de la ligne CSV envoyée
- Changer la durée d'affichage du message de succès (actuellement 3 secondes)

**Ce qu'il ne faut pas toucher sans raison :**
- La logique `try/catch` autour de `BluetoothModule.envoyerDonneesPC`
- Le `useEffect` de demande de permissions

---

### `styles.ts`
**Chemin :** `appCollege/styles.ts`

**Rôle :** Contient tous les styles visuels de l'app (couleurs, tailles, marges, ombres). Séparé de `App.tsx` pour garder le code lisible.

**Quand le modifier :**
- Changer une couleur (fond, bouton, texte)
- Modifier la taille d'un texte ou d'un champ
- Ajuster les marges ou l'espacement
- Ajouter le style d'un nouveau composant

**Correspondance styles ↔ composants :**

| Style | Composant dans App.tsx |
|---|---|
| `safeArea` | Conteneur global de l'écran |
| `carteFormulaire` | La carte blanche centrale |
| `titrePrincipal` | "Passage à l'infirmerie" |
| `sousTitre` | Le texte d'instruction |
| `label` | Les labels "Ton nom de famille" etc. |
| `input` | Les champs de saisie |
| `boutonValider` | Le bouton bleu |
| `boutonDesactive` | Le bouton grisé pendant l'envoi |
| `messageSucces` | Le bandeau vert de confirmation |
| `messageErreur` | Le bandeau rouge d'erreur |

---

### `AndroidManifest.xml`
**Chemin :** `appCollege/android/app/src/main/AndroidManifest.xml`

**Rôle :** Déclare les permissions que l'app demande à Android. Sans ces permissions, le Bluetooth est totalement bloqué par le système.

**Permissions présentes et pourquoi :**

```xml
<!-- Internet : requis par React Native pour le dev, inoffensif en production -->
android.permission.INTERNET

<!-- Bluetooth legacy pour Android 11 et inférieur -->
android.permission.BLUETOOTH
android.permission.BLUETOOTH_ADMIN

<!-- Bluetooth moderne obligatoire pour Android 12+ -->
android.permission.BLUETOOTH_SCAN
android.permission.BLUETOOTH_CONNECT
```

**Quand le modifier :**
- Ajouter une nouvelle permission (ex: accès caméra, stockage)
- Ne jamais supprimer les permissions Bluetooth existantes

---

### `BluetoothModule.kt`
**Chemin :** `appCollege/android/app/src/main/java/com/appcollege/BluetoothModule.kt`

**Rôle :** C'est le cœur du système. Ce fichier Kotlin gère tout ce qui touche au Bluetooth : trouver le PC, ouvrir la connexion, envoyer la donnée, gérer les pannes.

**Ce qu'il fait étape par étape quand `envoyerDonneesPC()` est appelé :**

1. Vérifie que les permissions Bluetooth sont accordées
2. Vérifie que le Bluetooth est activé sur la tablette
3. Récupère la liste des appareils appairés dans les paramètres Android
4. Prend le premier appareil de la liste (le PC de l'infirmière)
5. Ouvre un socket RFCOMM avec l'UUID SPP standard
6. Envoie la ligne de texte + `\n`
7. Si des lignes étaient en tampon (pannes précédentes), les renvoie aussi
8. Ferme le socket immédiatement (0% batterie en tâche de fond)

**En cas d'échec :**
- Stocke la ligne dans `SharedPreferences` (mémoire interne Android)
- Rejette la promesse → `App.tsx` affiche le message d'erreur
- Au prochain envoi réussi, le tampon est renvoyé automatiquement

**Constantes importantes dans le fichier :**

| Constante | Valeur | Rôle |
|---|---|---|
| `UUID_SPP` | `00001101-0000-1000-8000-00805F9B34FB` | UUID standard Bluetooth Serial Port Profile — ne jamais changer |
| `PREFS_NOM` | `bluetooth_tampon` | Nom du fichier de tampon interne |
| `PREFS_COMPTEUR` | `tampon_compteur` | Clé qui compte les lignes en attente |

**Quand le modifier :**
- Changer la logique de sélection du PC (ex: filtrer par nom d'appareil au lieu de prendre le premier)
- Modifier le format de la ligne envoyée (actuellement géré dans `App.tsx`)
- Changer la stratégie du tampon

**Ce qu'il ne faut jamais changer :**
- L'UUID SPP (`00001101-0000-1000-8000-00805F9B34FB`) — c'est un standard universel
- Le nom de la fonction `envoyerDonneesPC` — il doit correspondre exactement à l'appel dans `App.tsx`
- Le nom du module `BluetoothModule` dans `getName()` — il doit correspondre à `NativeModules.BluetoothModule` dans `App.tsx`

---

### `BluetoothPackage.kt`
**Chemin :** `appCollege/android/app/src/main/java/com/appcollege/BluetoothPackage.kt`

**Rôle :** Fichier de liaison. Il dit à React Native "le module `BluetoothModule` existe, enregistre-le". Sans lui, `App.tsx` ne peut pas trouver `NativeModules.BluetoothModule`.

**Quand le modifier :**
- Pratiquement jamais. Seulement si on ajoute un deuxième module natif Kotlin.

---

### `MainApplication.kt`
**Chemin :** `appCollege/android/app/src/main/java/com/appcollege/MainApplication.kt`

**Rôle :** Fichier de démarrage de l'application Android. Il déclare tous les packages (modules natifs) utilisés.

**La ligne importante :**
```kotlin
add(BluetoothPackage())
```
C'est cette ligne qui active le module Bluetooth dans l'app.

**Quand le modifier :**
- Si on ajoute un nouveau module natif Kotlin, on ajoute une ligne `add(NouveauPackage())` au même endroit.

---

## 4. Cas de maintenance courants

---

### Changer le texte affiché à l'élève

**Fichier à modifier :** `App.tsx`

Repère les balises `<Text>` dans le JSX et modifie le contenu. Par exemple pour changer le titre :

```tsx
// Avant
<Text style={styles.titrePrincipal}>Passage à l'infirmerie</Text>

// Après
<Text style={styles.titrePrincipal}>Bienvenue à l'infirmerie</Text>
```

---

### Changer une couleur ou une taille de texte

**Fichier à modifier :** `styles.ts`

Repère le style correspondant dans le tableau de la section 3 et modifie la valeur. Par exemple pour changer la couleur du bouton :

```ts
// Avant
boutonValider: {
  backgroundColor: '#2e7bc4',
  ...
}

// Après
boutonValider: {
  backgroundColor: '#1a5c9a',
  ...
}
```

---

### Le PC de l'infirmière a changé (nouvel ordinateur)

**Aucun fichier à modifier.** Le module Kotlin prend automatiquement le premier appareil appairé dans les paramètres Android. Il suffit de :

1. Aller dans **Paramètres → Bluetooth** sur la tablette
2. Supprimer l'ancien PC de la liste des appareils appairés
3. Appairer le nouveau PC

L'app fonctionnera automatiquement avec le nouveau PC.

---

### Ajouter un champ de saisie (ex: numéro de classe)

**Fichiers à modifier :** `App.tsx` et `styles.ts`

Dans `App.tsx` :
1. Ajouter un état : `const [classe, setClasse] = useState<string>('');`
2. Ajouter le champ dans le JSX (copier le bloc d'un champ existant)
3. Ajouter le champ dans la ligne CSV : `` `${nomMaj};${prenomPropre};${classe};${dateISO}` ``

Dans `styles.ts` : aucune modification nécessaire si le champ utilise le style `input` existant.

---

### Le message d'erreur reste affiché trop longtemps

**Fichier à modifier :** `App.tsx`

Actuellement le message de succès disparaît après 3 secondes. Le message d'erreur reste jusqu'à ce que l'élève agisse. Pour ajouter un timeout sur l'erreur :

```tsx
// Dans le catch de handleValider, ajouter :
setTimeout(() => {
  setStatut('IDLE');
}, 8000); // 8 secondes
```

---

### Recompiler et regénérer l'APK après une modification

Depuis le dossier racine du projet :

```bash
cd android
./gradlew assembleRelease
```

L'APK est généré ici :
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## 5. Commandes de développement

Ces commandes se lancent depuis le dossier racine du projet (`appCollege/`).

---

### Lancer le serveur Metro (bundler JavaScript)

Le serveur Metro compile le code JavaScript en temps réel. Il doit tourner en arrière-plan pendant le développement.

```bash
npm start
```

Laisser ce terminal ouvert. Si le serveur est déjà lancé, React Native le détecte automatiquement.

Pour forcer un rechargement propre du cache (si l'app se comporte bizarrement) :

```bash
npm start -- --reset-cache
```

---

### Lancer l'app sur une tablette ou émulateur Android

Dans un second terminal, avec la tablette branchée en USB ou un émulateur ouvert :

```bash
npm run android
```

Cette commande compile le code Kotlin, installe l'APK de développement sur la tablette, et démarre l'app automatiquement. Le serveur Metro doit être lancé en parallèle.

---

### Résumé — ordre de lancement en développement

```bash
# Terminal 1 : lancer le serveur Metro
npm start

# Terminal 2 : compiler et lancer sur la tablette
npm run android
```

---

### Différence entre développement et production

| | Développement (`npm run android`) | Production (`./gradlew assembleRelease`) |
|---|---|---|
| Utilisation | Tester pendant le développement | Installer sur la tablette des élèves |
| Serveur Metro | Requis (doit tourner en parallèle) | Non requis |
| Rechargement | Automatique à chaque sauvegarde | Non disponible |
| Fichier généré | Installé directement sur la tablette | Fichier APK à distribuer |

---

## 6. Compiler et installer l'APK

### Générer l'APK

```bash
cd android
./gradlew assembleRelease
```

### Installer via câble USB

Brancher la tablette au PC, activer le débogage USB sur la tablette, puis :

```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

### Installer via clé USB ou Google Drive

1. Copier le fichier `app-release.apk` sur une clé USB ou l'uploader sur Google Drive
2. Sur la tablette, ouvrir le fichier depuis le gestionnaire de fichiers
3. Si Android bloque l'installation : **Paramètres → Sécurité → Installer des apps inconnues** → autoriser

---

## 7. Dépannage Bluetooth

### L'app affiche "Il y a un souci, appelle un adulte"

Causes possibles et solutions :

| Cause | Solution |
|---|---|
| Bluetooth désactivé sur la tablette | Activer le Bluetooth dans les paramètres Android |
| Aucun appareil appairé | Appairer le PC dans Paramètres → Bluetooth |
| PC trop loin ou éteint | Rapprocher la tablette du PC et vérifier que le PC est allumé |
| Permissions refusées | Paramètres → Applications → appCollege → Permissions → activer Bluetooth |

### Les lignes en tampon ne sont pas renvoyées

Le renvoi automatique se déclenche uniquement au prochain envoi réussi. Si le Bluetooth reste en panne longtemps, les lignes restent stockées en mémoire interne et seront renvoyées dès que la connexion revient.

### Vérifier les logs Bluetooth en temps réel (pour les développeurs)

Avec la tablette branchée en USB :

```bash
adb logcat -s BluetoothModule
```

Cela affiche tous les logs du module Kotlin en temps réel.
