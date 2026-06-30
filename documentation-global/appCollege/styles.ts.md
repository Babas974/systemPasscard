# styles.ts

## Chemin du fichier
`styles.ts`

## Description
Fichier de styles React Native thématisés. Fournit une fonction factory `createStyles(theme)` qui génère toutes les feuilles de style en fonction du thème actif (clair/sombre).

## Composants/clés principaux
- **`createStyles(theme: Theme)`** : Fonction qui retourne un objet `StyleSheet` complet avec tous les styles de l'application

### Catégories de styles :
- **SafeArea / Layout** : `safeArea`, `scrollContainer`, `carteFormulaire`
- **Formulaire** : `label`, `input`, `inputGris`, `sousTitre`
- **Boutons** : `boutonValider`, `boutonSuivant`, `boutonRetour`, `boutonDesactive`, `boutonRelancer`, `boutonChangerPC`
- **Messages** : `messageSucces`, `messageErreur`
- **Header** : `headerRow`, `titrePrincipal`, `boutonRond`, `etapeLabel`
- **Badge** : `badge`, `badgeTexte`
- **Radio buttons** : `radioRow`, `radioItem`, `radioItemActif`, `radioTexte`, `radioTexteActif`
- **Historique** : `historiqueSection`, `historiqueItem`, `historiqueStatut*`
- **Modal** : `modalOverlay`, `modalContenu`, `modalItem*`
- **Debug** : `boutonDebug`, `consolePanel`, `debugPanel`, `consoleOverlay`, `consoleLigne*`
- **Barre de connexion** : `barreConnexion`, `dotConnexion`, `texteConnexion`
- **Settings** : `settingsHeader`, `settingsBouton`, `settingsHistorique*`, `settingsVersion`

## Dépendances
- `react-native` : `StyleSheet`
- `./theme` : `Theme`

## Détails importants
- Les styles de la console de debug utilisent un fond `#1a1a2e` avec des bordures rouges `#e94560`
- Le bouton flottant debug est positionné en bas à droite avec un effet d'ombre
- Les styles utilisent des polices spécifiques (`Georgia`, `monospace`)
- Les ombres et élévations sont configurées pour Android (`elevation`) et iOS (`shadowColor/Offset/Opacity/Radius`)
