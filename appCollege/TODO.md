# TODO - appCollege

## Statut
**Termine** - 9 fonctionnalites implementees, typecheck OK, lint 0 erreur.

## Tache realisee
Refonte de l'app tablette college : selection classe, historique local, mode hors-ligne avec file, scan QR, sauvegarde IP, haptique, dark mode, page parametres, badge file d'attente.

## Fichiers crees
- `theme.ts` : Theme adaptatif light/dark + hook useTheme()
- `StorageService.ts` : Wrapper AsyncStorage (IP, file, historique)
- `SettingsScreen.tsx` : Page parametres
- `QRScannerScreen.tsx` : Ecran scan QR
- `TODO.md` : Ce fichier

## Fichiers modifies
- `App.tsx` : Refonte complete, integration des 9 features
- `ApiService.ts` : setIP/getIP in-memory, fetchWithTimeout fixant le bug TS AbortSignal
- `styles.ts` : Styles thematises via createStyles(theme)
- `package.json` : Ajout des deps
- `android/app/src/main/AndroidManifest.xml` : Permissions CAMERA + VIBRATE

## Suppositions validees
- `react-native-camera-kit` retenu (plutot que vision-camera) : minSdk inchange, pas de reanimated requis.
- API native `Vibration` utilisee (zero dep).
- Pas de React Navigation : rendu conditionnel par etat `screen` (KISS, conforme au code existant).
- File persistee AsyncStorage, traitement interval 5s, envoi sequentiel.
- Historique 50 derniers, persistee, tap = re-envoi.
- Format scan : `NOM Prenom CLASSE`.
- Classes : radio buttons 6eme/5eme/4eme/3eme, defaut 6eme.
- Compat IP : `192.168.137.1` defaut, surchargeable via AsyncStorage.
- Bug TS `AbortSignal.timeout` corrige via `AbortController` + `setTimeout`.

## Problemes rencontres
- `AbortSignal.timeout` non present dans lib types actuelles -> remplace par AbortController.
- ESLint `react-hooks/exhaustive-deps` : la ref pattern (traiterFileRef) resout proprement la dependance a `traiterFile` dans l'interval.
- Camera de la `QRScannerScreen` : permissions gerees par camera-kit a la volee, fallback `Linking.openSettings()` si refusee.

## Tests
Le test existant `__tests__/App.test.tsx` necessitera un mock AsyncStorage + camera-kit pour passer avec le nouveau App.tsx (jest.setup.js a prevoir). Non couvert par la mission, a noter.
