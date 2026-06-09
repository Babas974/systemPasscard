# Vue Globale - LOGI-INFIRMERIE

Ce document réunit la vision technique, la cartographie logicielle et les spécifications exactes du projet **Logi-Infirmerie**. Conçu selon la règle **KISS (Keep It Simple, Stupid)**, ce système supprime tout besoin d'infrastructure réseau (Wi-Fi/Internet), d'exports manuels ou de clés USB en reliant directement l'application de saisie des élèves au tableau de bord de l'infirmière.

---

## 🏗️ 1. Schéma de l'Architecture

```
       [ APPAREIL ANDROID (ÉLÈVE) ]                           [ PC WINDOWS (INFIRMIÈRE) ]
 ┌──────────────────────────────────────┐                      ┌──────────────────────────────────────┐
 │                                      │                      │                                      │
 │   INTERFACE UTILISATEUR (90%)        │                      │   PAGE WEB LOCALE (DASHBOARD)        │
 │   - React Native (TS)                │                      │   - HTML5 / CSS3 (Pico.css)          │
 │   - Champs texte Nom et Prénom       │                      │   - JavaScript natif (Vanilla JS)    │
 │                                      │                      │                                      │
 │                  │                   │                      │                  ▲                   │
 │                  ▼ (Données / Pont)  │                      │                  │ (Flux de texte)   │
 │   MODULE NATIF KOTLIN (10%)          │                      │   API WEB SERIAL                     │
 │   - Bridge ReactMethod               │                      │   - navigator.serial                 │
 │   - Permissions & Bluetooth Socket   │                      │   - Écoute active du Port COM        │
 │   - Gestion tampon (Plan secours)    │                      │                  ▲                   │
 │                  │                   │                      │                  │                   │
 └──────────────────┼───────────────────┘                      └──────────────────┼───────────────────┘
                    │                                                             │
                    │                                                             │
                    └───────────► TRANSMISSION SANS FIL (0% RAM ext) ─────────────┘
                                  - Protocole Bluetooth Classic (RFCOMM)
                                  - Profil SPP (Serial Port Profile)
                                  - Liaison chiffrée directe & instantanée

```

---

## 🛠️ 2. Stack Technique & Spécifications des Composants

### A. Composant Émetteur : L'Application Mobile Android

L'application s'exécute sur le terminal Android mis à la disposition des élèves à l'entrée de l'infirmerie. Elle fusionne une interface graphique JavaScript et un contrôleur système Kotlin pour éviter tout processus démon externe.

* **Interface Graphique (React Native & TypeScript - 90% de la complexité globale) :**
* Deux champs de texte épurés pour le **Nom** (automatiquement forcé en lettres majuscules) et le **Prénom**.
* Au clic sur le bouton "Valider", l'interface assemble les champs, génère une chaîne au format CSV (ex: `BABAS;S.;2026-05-22T12:34:56.789Z`) et appelle la méthode exposée par le pont natif.


* **Module Matériel et Routage (Kotlin Natif - 10% de la complexité globale) :**
* **Pont (Native Module Bridge) :** Utilisation de l'annotation `@ReactMethod` pour exposer la fonction d'envoi au code JavaScript. Le texte transite sous forme de simple `String`.
* **Permissions :** Vérification et demande des autorisations d'antenne modernes d'Android (`BLUETOOTH_SCAN` et `BLUETOOTH_CONNECT`).
* **Transmission RFCOMM instantanée :** Ouverture d'un canal direct (`BluetoothSocket`) vers l'adresse MAC du PC. Le module pousse la ligne de texte sur le flux de sortie (`OutputStream`), puis referme immédiatement le socket (consommation de batterie égale à zéro en dehors des envois).
* **Plan de secours (Mémoire tampon) :** Si la connexion Bluetooth échoue, le module lève une exception captée par React Native, qui stocke temporairement la ligne dans un dictionnaire local léger via **`AsyncStorage`**. Le flux en attente est automatiquement renvoyé dès la prochaine liaison Bluetooth réussie.



### B. Le Canal de Transmission (Sans Fil)

* **Protocole :** Bluetooth Classic.
* **Profil :** SPP (Serial Port Profile) via une communication de type **RFCOMM** (Port série virtuel).
* **Indépendance réseau absolue :** Le système fonctionne sans aucune infrastructure réseau (pas de routeur, pas d'accès internet au sein du collège). La consommation d'énergie est extrêmement faible car l'antenne n'émet un signal fort que pendant les quelques millisecondes nécessaires à la transmission de la ligne textuelle.

### C. Composant Récepteur : Le Dashboard Infirmière sur Windows

Le terminal de réception est le PC professionnel de l'infirmière sous Windows. La conception évite l'installation d'un interpréteur ou d'un serveur lourd (zéro Node.js, zéro Python sur le PC) pour maximiser la sécurité et la fluidité.

* **Couche Système Windows :** À l'appairage initial avec le téléphone Android, Windows attribue automatiquement un port de communication série virtuel (ex: `COM3`) et redirige le flux binaire de manière transparente.
* **Interface de Suivi (HTML5 / Vanilla JS / Pico.css) :** L'infirmière ouvre simplement un fichier local nommé `dashboard.html` dans son navigateur web (Chrome ou Edge). Le design est géré automatiquement par le framework ultra-léger **Pico.css**.
* **Capture des données :** L'API Web standard **`navigator.serial`** s'attache au port `COM` configuré et écoute passivement les lignes de texte entrantes sans aucun rafraîchissement manuel de la page.
* **Base de Données Locale :** Utilisation de la bibliothèque **LocalForage** (Mozilla) pour s'interfacer avec la base IndexedDB embarquée du navigateur. Cela permet un stockage persistant à long terme sur le disque dur du PC via une syntaxe clé-valeur simple.
* **Gestion du Temps :** Intégration de la bibliothèque **date-fns** pour piloter les chronos en temps réel.

---

## 🔄 3. Cycle de Traitement d'une Donnée (Strictement Synchrone)

```
[ Saisie Élève ] ──► [ Validation ] ──► [ Pont Kotlin ] ──► [ Envoi Bluetooth ]
                                                                     │
 ┌─────────────────────── Réception PC Réussie ──────────────────────┘
 ▼
[ LocalForage : IL STOCKE ] ──► [ HTML/DOM : PUIS IL AFFICHE ] ──► [ Activation Miniteur ]

```

Dès qu'une nouvelle ligne CSV arrive sur le Port COM du PC via l'API Serial, le script JavaScript exécute la séquence indéboulonnable suivante :

1. **Déchiquetage et Stockage Initial :** La ligne est découpée via le séparateur point-virgule (`;`) pour former un objet JavaScript structuré contenant le nom, le prénom et l'heure. Cet objet est immédiatement enregistré de manière asynchrone dans **LocalForage** en utilisant l'horodatage (`dateHeure`) comme clé unique. La donnée est sécurisée sur le disque dur avant toute manipulation graphique.
2. **Affichage Dynamique :** Une fois la promesse de stockage validée avec succès, l'élève est injecté dynamiquement tout en haut du tableau HTML (tri chronologique décroissant).
3. **Suivi Temporel :** Un minuteur actif (géré par un `setInterval` de 30 secondes) recalcule le temps écoulé depuis l'arrivée de l'élève (ex: "Arrivé il y a 3 min") et met à jour l'affichage de l'infirmière.
