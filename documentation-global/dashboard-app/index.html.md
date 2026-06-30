# index.html

**Chemin du fichier :** `app/index.html`

## Description

Point d'entrée HTML de l'application. Fournit la structure de base du document, les styles CSS globaux et charge le bundle JavaScript principal.

## Composants/clés/fonctions/exportations

- **DOCTYPE** : `<!doctype html>`
- **html lang="fr"** — document en français
- **meta charset** : UTF-8
- **meta viewport** : responsive design
- **title** : "Recepteur HID Securise"
- **style inline** :
  - Reset CSS (`box-sizing`, `margin`, `padding`)
  - Body : police system-ui, fond sombre (#111827), texte clair
  - `#root` : conteneur flex column pleine hauteur
- **script** : charge `/src/main.tsx` en tant que module ES

## Dépendances

- `/src/main.tsx` — point d'entrée React

## Détails importants

- Le titre "Recepteur HID Securise" indique que l'application est un récepteur de données HID (Human Interface Device) sécurisé.
- Le fond sombre (#111827) correspond au thème par défaut de l'application.
- Pas de favicon défini.
