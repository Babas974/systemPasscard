// SettingsScreen.tsx
// Page de parametres : debug console, test connexion, vider historique, liste eleves.

import React, { useState, useEffect, useCallback } from 'react';
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
import { getApiBaseUrl } from './ApiService';
import { HistoryEntry, DeleteQueueEntry } from './StorageService';
import { getLogsLocaux, getNbErreursLocales } from './Logger';

interface Props {
  theme: Theme;
  version: string;
  ipActuelle: string;
  pcConnecte: boolean;
  onClose: () => void;
  onViderHistorique: () => Promise<void>;
  onTesterConnexion: () => Promise<boolean>;
  historique?: HistoryEntry[];
  fileSuppression?: DeleteQueueEntry[];
}

interface LogEntry {
  id: number;
  source: string;
  niveau: string;
  message: string;
  date_heure: string;
}

const COULEURS_NIVEAU: Record<string, string> = {
  debug: '#7c8da0',
  info: '#4a9eff',
  warn: '#f5a623',
  error: '#ff5e57',
  fatal: '#ff2d55',
};

export default function SettingsScreen({
  theme,
  version,
  ipActuelle,
  pcConnecte,
  onClose,
  onViderHistorique,
  onTesterConnexion,
  historique = [],
  fileSuppression = [],
}: Props) {
  const styles = createStyles(theme);
  const [testEnCours, setTestEnCours] = useState(false);
  const [testResultat, setTestResultat] = useState<string | null>(null);
  const [consoleOuverte, setConsoleOuverte] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [nbErreurs, setNbErreurs] = useState(0);

  // Charger les logs depuis le buffer local (plus besoin du PC)
  const chargerLogs = useCallback(() => {
    const locaux = getLogsLocaux(100);
    const entries: LogEntry[] = locaux.map((l, i) => ({
      id: i,
      source: l.source,
      niveau: l.niveau,
      message: l.message,
      date_heure: new Date(l.timestamp).toISOString(),
    }));
    setLogs(entries);
    setNbErreurs(getNbErreursLocales());
  }, []);

  useEffect(() => {
    if (consoleOuverte) {
      chargerLogs();
      const interval = setInterval(chargerLogs, 2000);
      return () => clearInterval(interval);
    }
  }, [consoleOuverte, chargerLogs]);

  const handleTester = async () => {
    setTestEnCours(true);
    setTestResultat(null);
    const ok = await onTesterConnexion();
    setTestEnCours(false);
    setTestResultat(ok ? 'Connexion reussie !' : 'PC injoignable');
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

  const viderLogs = async () => {
    setLogs([]);
    setNbErreurs(0);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.settingsHeader}>
        <Text style={styles.settingsTitre}>Parametres</Text>
        <TouchableOpacity onPress={onClose} style={styles.settingsBoutonFermer}>
          <Text style={styles.settingsTexteFermer}>X</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.settingsScroll}>
        {/* Debug console */}
        <TouchableOpacity
          style={styles.settingsBouton}
          onPress={() => setConsoleOuverte(!consoleOuverte)}
          activeOpacity={0.7}
        >
          <Text style={styles.settingsBoutonTexte}>debug console</Text>
          {nbErreurs > 0 && (
            <View style={styles.settingsBadge}>
              <Text style={styles.settingsBadgeTexte}>{nbErreurs}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Console overlay */}
        {consoleOuverte && (
          <View style={styles.consoleOverlay}>
            <View style={styles.consoleHeader}>
              <Text style={styles.consoleTitre}>Logs ({logs.length})</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={viderLogs}>
                  <Text style={styles.consoleEffacer}>Vider</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setConsoleOuverte(false)}>
                  <Text style={styles.consoleFermer}>X</Text>
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView style={styles.consoleScroll}>
              {logs.length === 0 ? (
                <Text style={styles.consoleVide}>Aucun log. Ouvrez la console apres des actions.</Text>
              ) : (
                logs.map((l) => (
                  <View key={l.id} style={styles.consoleLigne}>
                    <Text style={[styles.consoleBadge, { backgroundColor: COULEURS_NIVEAU[l.niveau] || '#888' }]}>
                      {l.niveau.toUpperCase()}
                    </Text>
                    <Text style={styles.consoleSource}>[{l.source}]</Text>
                    <Text style={styles.consoleMessage} numberOfLines={2}>
                      {l.message}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        )}

        {/* Tester la connexion */}
        <TouchableOpacity
          style={styles.settingsBouton}
          onPress={handleTester}
          activeOpacity={0.7}
          disabled={testEnCours}
        >
          {testEnCours ? (
            <ActivityIndicator color={theme.text} />
          ) : (
            <Text style={styles.settingsBoutonTexte}>Tester la connexion</Text>
          )}
        </TouchableOpacity>
        {testResultat && (
          <Text style={[
            styles.settingsResultat,
            { color: testResultat.includes('reussie') ? theme.successText : theme.errorText },
          ]}>
            {testResultat}
          </Text>
        )}

        {/* Vider l'historique */}
        <TouchableOpacity
          style={styles.settingsBouton}
          onPress={handleViderHistorique}
          activeOpacity={0.7}
        >
          <Text style={styles.settingsBoutonTexte}>Vider l'historique</Text>
        </TouchableOpacity>
        {fileSuppression.length > 0 && (
          <Text style={[styles.settingsResultat, { color: theme.warning }]}>
            {fileSuppression.length} suppression(s) en attente sur le serveur
          </Text>
        )}

        {/* Historique des eleves */}
        <View style={styles.settingsHistorique}>
          <Text style={styles.settingsHistoriqueTitre}>Historique</Text>
          <ScrollView style={styles.settingsHistoriqueScroll}>
            {historique.length === 0 ? (
              <Text style={styles.settingsHistoriqueVide}>Aucun passage enregistre.</Text>
            ) : (
              historique.map((e) => (
                <TouchableOpacity
                  key={e.id}
                  style={styles.settingsHistoriqueItem}
                  onPress={() => Alert.alert('Scan', e.contenu)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.settingsHistoriqueNom} numberOfLines={1}>{e.contenu}</Text>
                  <Text style={styles.settingsHistoriqueHeure}>
                    {new Date(e.creeLe).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>

        {/* Version */}
        <Text style={styles.settingsVersion}>v{version}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
