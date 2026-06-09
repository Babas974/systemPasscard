# Plan d'Architecture - LOGI-INFIRMERIE Mobile

Voici la modélisation textuelle de l'architecture fluide, automatisée et mise à jour selon le principe KISS (Keep It Simple, Stupid). Le système supprime définitivement le besoin de scripts Python tiers ou de serveurs d'arrière-plan lourds sur Android. La brique Kotlin passe à 10% de la complexité pour centraliser à la fois la gestion des permissions, le pont et la transmission matérielle directe.

```
       [ APPAREIL ANDROID (ÉLÈVE) ]                           [ PC WINDOWS (INFIRMIÈRE) ]
 ┌──────────────────────────────────────┐                      ┌──────────────────────────────────────┐
 │                                      │                      │                                      │
 │   INTERFACE UTILISATEUR (90%)        │                      │   PAGE WEB LOCALE (DASHBOARD)        │
 │   - React Native (TS)                │                      │   - HTML5 / CSS3 (Pico.css)          │
 │   - Boutons radio Niveaux            │                      │   - JavaScript natif (Vanilla JS)    │
 │   - Champ texte Division             │                      │                                      │
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

## Spécifications Détaillées de l'Architecture

### 1. Composant Émetteur : L'Application Mobile Android

L'application s'exécute sur une tablette ou un smartphone Android mis à la disposition des élèves à l'entrée de l'infirmerie. Elle fusionne une interface graphique JavaScript et un contrôleur système Kotlin pour éviter tout processus démon externe.

#### A. Interface Graphique (React Native & TypeScript - 90% de la complexité globale)

* **Ergonomie simplifiée (KISS) :** L'interface affiche deux champs de texte épurés pour le **Nom** (automatiquement forcé en lettres majuscules) et le **Prénom**.
* **Saisie de la classe sans friction :** Pour éviter les erreurs de frappe des élèves, la sélection de la classe est divisée en deux étapes :

1. Un groupe de gros boutons radio pour sélectionner instantanément le niveau global : `6ème`, `5ème`, `4ème`, ou `3ème`.
2. Un champ de texte compact adjacent où l'élève tape uniquement sa division (ex: `B`, `C`, `Segpa`).

* **Validation et formatage :** Au clic sur le bouton "Valider", React Native assemble les champs, génère une chaîne au format CSV (ex: `BABAS;S.;6ème B;2026-05-22T12:34:56.789Z`) et appelle directement la méthode exposée par le pont natif.

#### B. Module Matériel et Routage (Kotlin Natif - 10% de la complexité globale)

* **Pont de communication (Native Module Bridge) :** Utilisation de l'annotation `@ReactMethod` pour exposer la fonction d'envoi directement au code JavaScript de React Native. Le texte transite sous forme de simple `String`.
* **Gestion des permissions système :** Au lancement, ce module intercepte et valide les permissions d'antenne modernes d'Android (`BLUETOOTH_SCAN` et `BLUETOOTH_CONNECT`).
* **Transmission RFCOMM instantanée :** Le code Kotlin ouvre un canal de communication direct (`BluetoothSocket`) vers l'adresse MAC du PC de l'infirmière. Il pousse la ligne de texte sur le flux de sortie (`OutputStream`), puis referme immédiatement le socket pour une consommation de batterie égale à zéro en dehors des envois.
* **Plan de secours intégré (Mémoire tampon) :** Si la connexion Bluetooth échoue, le module lève une exception captée par React Native, qui stocke temporairement la ligne dans un fichier ou un dictionnaire local léger (`AsyncStorage`). Le flux en attente est automatiquement renvoyé dès la prochaine liaison Bluetooth réussie.

---

### 2. Le Canal de Transmission : Bluetooth Classic & RFCOMM

* **Indépendance réseau absolue :** Le système fonctionne sans aucune infrastructure réseau (pas de routeur Wi-Fi, pas d'accès internet au sein du collège).
* **Profil SPP (Serial Port Profile) :** La liaison émule un câble série virtuel entre le smartphone et le PC. La consommation d'énergie est extrêmement faible car l'antenne n'émet un signal fort que pendant les quelques millisecondes nécessaires à la transmission de la ligne textuelle.

---

### 3. Composant Récepteur : Le Dashboard Infirmière sur Windows

Le terminal de réception est le PC professionnel de l'infirmière sous Windows. La conception évite l'installation d'un interpréteur ou d'un serveur lourd (zéro Node.js, zéro Python sur le PC) pour maximiser la sécurité et la fluidité.

#### A. Couche Système Windows (Port COM Virtuel)

* À l'appairage initial avec le téléphone Android, Windows attribue automatiquement un port de communication série virtuel (ex: `COM3`).
* Le système d'exploitation intercepte nativement le flux binaire Bluetooth entrant et le redirige de façon transparente vers ce port COM.

#### B. Interface de Suivi et Stockage (HTML5 / Vanilla JS / LocalForage)

* **Zéro Installation :** L'infirmière ouvre simplement un fichier local nommé `dashboard.html` dans son navigateur web (Chrome ou Edge).
* **API Web Serial (navigator.serial) :** Le script JavaScript natif (`dashboard.js`) utilise les capacités modernes du navigateur pour s'attacher au port `COM` configuré. Il écoute passivement les lignes de texte entrantes sans aucun rafraîchissement manuel de la page.
* **Persistance Locale Isolée (KISS) :** Le script intègre la bibliothèque ultra-légère **LocalForage** pour s'interfacer de manière transparente avec la base de données IndexedDB embarquée du navigateur. Cela élimine le besoin d'installer un système de base de données externe sur la machine.
* **Séquence de Traitement (Stockage puis Affichage) :** À chaque réception d'une nouvelle ligne CSV par l'API Serial, le script effectue les actions suivantes dans cet ordre strict :

1. **Déchiquetage et Stockage Initial :** La ligne est découpée via le séparateur point-visgule (`;`) pour former un objet JavaScript structuré. Cet objet est immédiatement enregistré de manière asynchrone dans **LocalForage** en utilisant l'horodatage (`dateHeure`) comme clé unique. Cela sécurise la donnée sur le disque dur avant toute manipulation graphique.
2. **Affichage Dynamique :** Une fois la promesse de stockage validée avec succès, l'élève est injecté dynamiquement tout en haut du tableau HTML (tri chronologique décroissant).
3. **Suivi Temporel :** Un minuteur actif (géré par un `setInterval` de 30 secondes) utilise la bibliothèque locale `date-fns.min.js` pour calculer et afficher le temps écoulé en direct depuis l'arrivée de l'élève (ex: "Arrivé il y a 3 min"), offrant un contrôle visuel constant à l'infirmière.
