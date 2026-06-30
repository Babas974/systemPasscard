# rn_edit_text_material.xml

## Chemin du fichier
`android/app/src/main/res/drawable/rn_edit_text_material.xml`

## Description
Drawable personnalisé pour les champs de texte React Native sur Android. Copie modifiée de `abc_edit_text_material` corrigeant un bug de NullPointerException.

## Composants/clés principaux
- **inset** : Drawable avec marges internes utilisant les dimensions AppCompat
- **selector** : 
  - **state_enabled="false"** : `abc_textfield_default_mtrl_alpha` — état désactivé
  - **default** : `abc_textfield_activated_mtrl_alpha` — état normal/activé

## Dépendances
- `@dimen/abc_edit_text_inset_horizontal_material`
- `@dimen/abc_edit_text_inset_top_material`
- `@dimen/abc_edit_text_inset_bottom_material`
- `@drawable/abc_textfield_default_mtrl_alpha`
- `@drawable/abc_textfield_activated_mtrl_alpha`

## Détails importants
- **Correction de bug** : L'item avec `state_pressed="false"` et `state_focused="false"` provoquait un `NullPointerException` sur `Drawable$ConstantState.newDrawable()` — supprimé dans cette version
- **Licence** : Apache License 2.0 (Android Open Source Project)
- Référence : react-native/pull/29452
