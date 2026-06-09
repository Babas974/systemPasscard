# Roadmap de Développement - LOGI-INFIRMERIE

Cette feuille de route suit strictement la règle **KISS** (Keep It Simple, Stupid). L'objectif est de construire un système fluide, ultra-léger et indépendant de tout réseau, en éliminant Python et en centralisant la logique sur un duo **React Native (90%) / Kotlin (10%)** côté mobile, et du **HTML/JS avec LocalForage** côté PC.

---

## 📅 Étape 1 : L'Interface Mobile (React Native & TypeScript) — *90% du projet*

*Objectif : Créer une application de saisie visuelle, rapide et sans friction pour les élèves dans l'IDE Zed.*

* [x] **Configuration de l'environnement :** Initialiser le projet React Native avec TypeScript ciblant Android.
* [x] **Formulaire de saisie épuré :** Champs texte simples pour le *Nom* (conversion automatique en MAJUSCULES) et *Prénom*.
* [ ] **Formatage des données :** Bouton "Valider" qui fusionne les champs et l'heure actuelle dans une ligne de texte brute au format CSV (`NOM;Prenom;Heure`).
* [ ] **Mise en place du plan de secours :** Intégrer `AsyncStorage` pour stocker temporairement la ligne de texte uniquement si le pont Kotlin signale que le Bluetooth du PC est déconnecté.

---

## 📡 Étape 2 : Le Canal Matériel (Kotlin Natif) — *10% du projet*

*Objectif : Ouvrir l'antenne Bluetooth et propulser le texte directement vers le PC.*

* [ ] **Création du Pont (Native Module Bridge) :** Create the Kotlin files in the `/android` folder and expose the `envoyerDonneesPC(ligne)` function to JavaScript via the `@ReactMethod` annotation.
* [ ] **Permissions Android :** Configurer et demander les autorisations requises à l'écran (`BLUETOOTH_SCAN` et `BLUETOOTH_CONNECT`).
* [ ] **Liaison Série RFCOMM/SPP :** Écrire le code Kotlin qui ouvre un `BluetoothSocket` vers l'adresse MAC du PC, pousse la ligne de texte sur l' `OutputStream`, puis coupe immédiatement le socket (0% RAM et batterie en tâche de fond).

---

## 💻 Étape 3 : Le Dashboard de Réception (PC Windows) — *Gestion propre par paquets*

*Objectif : Capter le flux série, sécuriser la donnée sur le disque dur du PC, puis l'afficher.*

* [ ] **Structure HTML/CSS :** Créer un fichier unique `dashboard.html` stylisé proprement avec le framework léger **Pico.css**.
* [ ] **API Web Serial (`navigator.serial`) :** Écrire le script `dashboard.js` pour écouter passivement en arrière-plan le Port COM virtuel généré automatiquement par Windows lors de l'appairage Bluetooth.
* [ ] **Gestion des dépendances modernes (Plus de téléchargement manuel) :** * Initialiser un mini projet Node pour le Dashboard et installer proprement `localforage` et `date-fns` via npm/bun.
* [ ] **Séquence Logique Synchrone :** Dès qu'une ligne arrive sur le Port COM :
1. **IL STOCKE :** Enregistrement immédiat de l'objet élève dans LocalForage (clé = horodatage).
2. **PUIS IL AFFICHE :** Injection de la nouvelle ligne tout en haut du tableau HTML.


* [ ] **Minuteur Dynamique :** Mettre en place un `setInterval` (toutes les 30 secondes) utilisant la bibliothèque `date-fns` (installée par npm) pour recalculer et afficher le temps écoulé en direct depuis l'arrivée de chaque élève (ex: *"Arrivé il y a 8 min"*).
