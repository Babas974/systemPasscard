# styles.xml

## Chemin du fichier
`android/app/src/main/res/values/styles.xml`

## Description
Définition du thème Android de l'application. Utilise un thème AppCompat sans barre d'action avec un style personnalisé pour les champs de saisie.

## Composants/clés principaux
- **AppTheme** (style) :
  - **parent** : `Theme.AppCompat.DayNight.NoActionBar`
  - **android:editTextBackground** : `@drawable/rn_edit_text_material` — style personnalisé pour les TextInput React Native

## Dépendances
- `Theme.AppCompat.DayNight.NoActionBar` : Thème de base AppCompat
- `@drawable/rn_edit_text_material` : Drawable personnalisé pour les champs de texte

## Détails importants
- **DayNight** : Supporte automatiquement le mode clair/sombre
- **NoActionBar** : La barre d'action est gérée par React Native (StatusBar)
