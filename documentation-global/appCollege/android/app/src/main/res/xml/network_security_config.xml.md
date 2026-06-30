# network_security_config.xml

## Chemin du fichier
`android/app/src/main/res/xml/network_security_config.xml`

## Description
Configuration de sécurité réseau Android. Autorise le trafic HTTP en clair (cleartext) et configure les certificats de confiance.

## Composants/clés principaux
- **base-config** :
  - **cleartextTrafficPermitted** : `true` — autorise le HTTP non chiffré
  - **trust-anchors** :
    - `certificates src="system"` : Certificats système
    - `certificates src="user"` : Certificats installés par l'utilisateur

## Dépendances
- Référencé par `AndroidManifest.xml`

## Détails importants
- **HTTP autorisé** : Indispensable pour communiquer avec le serveur PC local en HTTP
- **Certificats utilisateur** : Permet l'utilisation de certificats d'entreprise ou auto-signés
- **Sécurité** : Ne concerne que le trafic réseau, pas le stockage local
