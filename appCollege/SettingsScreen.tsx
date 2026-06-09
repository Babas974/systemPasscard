// SettingsScreen.tsx
// Page de parametres : statut connexion, vidage historique, test, version.
// L'IP du PC n'est plus modifiable depuis l'UI (cf. const DEFAULT_IP dans ApiService.ts).

import React, { useState } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Theme } from './theme';
import { createStyles } from './styles';
import { DEFAULT_IP } from './StorageService';

interface Props {
  theme: Theme;
  version: string;
  ipActuelle: string;
  pcConnecte: boolean;
  onClose: () => void;
  onViderHistorique: () => Promise<void>;
  onTesterConnexion: () => Promise<boolean>;
}

export default function SettingsScreen({
  theme,
  version,
  ipActuelle,
  pcConnecte,
  onClose,
  onViderHistorique,
  onTesterConnexion,
}: Props) {
  const styles = createStyles(theme);
  const [testEnCours, setTestEnCours] = useState(false);
  const [testResultat, setTestResultat] = useState<string | null>(null);

  const handleTester = async () => {
    setTestEnCours(true);
    setTestResultat(null);
    const ok = await onTesterConnexion();
    setTestEnCours(false);
    setTestResultat(ok ? 'Connexion reussie' : 'PC injoignable');
  };

  const handleViderHistorique = () => {
    Alert.alert(
      'Confirmer',
      'Vider tout l\'historique local ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Vider',
          style: 'destructive',
          onPress: async () => {
            await onViderHistorique();
            Alert.alert('OK', 'Historique vide.');
          },
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.scrollContainer, { paddingTop: 24 }]}>
        <ScrollView
          contentContainerStyle={{ alignItems: 'stretch', width: '100%' }}
        >
          <View style={styles.carteFormulaire}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <Text style={styles.titrePrincipal}>Parametres</Text>
              <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
                <Text
                  style={{ color: theme.primary, fontSize: 16, fontWeight: 'bold' }}
                >
                  Fermer
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Connexion au PC</Text>
            <View
              style={[
                styles.boutonChangerPC,
                {
                  backgroundColor: pcConnecte
                    ? theme.successBg
                    : theme.inputBackground,
                  borderColor: pcConnecte ? theme.successBorder : theme.border,
                  borderWidth: 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.texteBoutonPC,
                  {
                    color: pcConnecte ? theme.successText : theme.textSecondary,
                  },
                ]}
              >
                {pcConnecte
                  ? `Connecte (${ipActuelle})`
                  : `Injoignable (${ipActuelle})`}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                color: theme.textSecondary,
                marginTop: 4,
                textAlign: 'center',
              }}
            >
              IP par defaut : {DEFAULT_IP}
            </Text>

            <View
              style={{
                height: 1,
                backgroundColor: theme.border,
                marginVertical: 24,
              }}
            />

            <Text style={styles.label}>Tester la connexion</Text>
            <TouchableOpacity
              style={[styles.boutonValider, { backgroundColor: theme.warning }]}
              onPress={handleTester}
              activeOpacity={0.8}
              disabled={testEnCours}
            >
              {testEnCours ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.texteBouton}>Lancer le test</Text>
              )}
            </TouchableOpacity>
            {testResultat && (
              <Text
                style={{
                  marginTop: 12,
                  textAlign: 'center',
                  fontSize: 15,
                  fontWeight: 'bold',
                  color: testResultat.startsWith('Connexion')
                    ? theme.successText
                    : theme.errorText,
                }}
              >
                {testResultat}
              </Text>
            )}

            <View
              style={{
                height: 1,
                backgroundColor: theme.border,
                marginVertical: 24,
              }}
            />

            <Text style={styles.label}>Historique local</Text>
            <TouchableOpacity
              style={[styles.boutonValider, { backgroundColor: theme.errorBorder }]}
              onPress={handleViderHistorique}
              activeOpacity={0.8}
            >
              <Text style={styles.texteBouton}>Vider l'historique</Text>
            </TouchableOpacity>

            <View
              style={{
                height: 1,
                backgroundColor: theme.border,
                marginVertical: 24,
              }}
            />

            <Text style={styles.label}>Version</Text>
            <Text
              style={{
                color: theme.textSecondary,
                fontSize: 16,
                textAlign: 'center',
                marginBottom: 4,
              }}
            >
              {version}
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
