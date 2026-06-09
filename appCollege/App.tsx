// App.tsx
// App tablette college : formulaire de passage a l'infirmerie.
// Envoie les scans en HTTP POST au PC, gere la file d'attente hors-ligne,
// l'historique local, les parametres et le theme adaptatif.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Text,
  TextInput,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from './theme';
import { createStyles } from './styles';
import { envoyerScan, testerConnexion, setIP, getApiBaseUrl, resolveBaseUrl } from './ApiService';
import {
  loadIP,
  loadQueue,
  loadHistory,
  saveQueue,
  saveHistory,
  clearHistory as clearHistoryStorage,
  clearQueue as clearQueueStorage,
  generateId,
  HistoryEntry,
  QueueEntry,
} from './StorageService';
import {
  logInfo,
  logError,
  logFatal,
  startLogFlusher,
  installGlobalErrorHandler,
} from './Logger';
import SettingsScreen from './SettingsScreen';
import { version as appVersion } from './package.json';

startLogFlusher(3000);
installGlobalErrorHandler('App');

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { erreur: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { erreur: null };
  }

  static getDerivedStateFromError(erreur: Error) {
    return { erreur };
  }

  componentDidCatch(erreur: Error, info: React.ErrorInfo) {
    logFatal('ErrorBoundary', 'Crash React capture', {
      ...erreur,
      componentStack: info.componentStack,
    } as unknown as Error).catch(() => {});
  }

  render() {
    if (this.state.erreur) {
      return null;
    }
    return this.props.children;
  }
}

type Statut = 'IDLE' | 'SUCCESS' | 'ENVOI' | 'ERROR' | 'QUEUED';
type Screen = 'main' | 'settings';

const CONNEXION_CHECK_MS = 5000;
const QUEUE_TRAITEMENT_MS = 5000;

const vibrerSucces = () => Vibration.vibrate(60);

const vibrerErreur = () => {
  Vibration.vibrate(120);
  setTimeout(() => Vibration.vibrate(120), 200);
  setTimeout(() => Vibration.vibrate(120), 400);
};

const formatDate = (ts: number): string => {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${pad(
    d.getDate(),
  )}/${pad(d.getMonth() + 1)}`;
};

export function App() {
  const theme = useTheme();
  const styles = createStyles(theme);

  const [screen, setScreen] = useState<Screen>('main');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [statut, setStatut] = useState<Statut>('IDLE');
  const [statutMsg, setStatutMsg] = useState<string>('');
  const [pcConnecte, setPcConnecte] = useState(false);
  const [ipPC, setIpPC] = useState('127.0.0.1');

  const [file, setFile] = useState<QueueEntry[]>([]);
  const [historique, setHistorique] = useState<HistoryEntry[]>([]);

  const traitementEnCours = useRef(false);
  const envoiEnCours = statut === 'ENVOI';

  const ajouterHistorique = useCallback((entree: HistoryEntry) => {
    setHistorique((prev) => {
      const next = [entree, ...prev];
      return next.slice(0, 50);
    });
  }, []);

  const mettreAJourHistorique = useCallback(
    (id: string, patch: Partial<HistoryEntry>) => {
      setHistorique((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      );
    },
    [],
  );

  const traiterFile = useCallback(async () => {
    if (traitementEnCours.current) return;
    if (file.length === 0) return;
    const ok = await testerConnexion();
    if (!ok) return;

    traitementEnCours.current = true;
    try {
      const entree = file[0];
      const res = await envoyerScan(entree.contenu);
      if (res.statut === 'ok') {
        setFile((prev) => prev.slice(1));
        mettreAJourHistorique(entree.id, {
          statut: 'envoye',
          envoyeLe: Date.now(),
          erreur: undefined,
        });
        vibrerSucces();
      } else {
        mettreAJourHistorique(entree.id, {
          statut: 'erreur',
          erreur: res.message,
        });
      }
    } finally {
      traitementEnCours.current = false;
    }
  }, [file, mettreAJourHistorique]);

  useEffect(() => {
    const init = async () => {
      try {
        logInfo('App', `Demarrage v${appVersion}`);

        const savedIP = await loadIP();
        if (savedIP && savedIP !== '127.0.0.1') {
          setIP(savedIP);
        }

        const activeUrl = await resolveBaseUrl();
        setIpPC(activeUrl);

        const q = await loadQueue();
        setFile(q);

        const h = await loadHistory();
        setHistorique(h);

        logInfo('App', `Init OK (url=${activeUrl}, file=${q.length}, hist=${h.length})`);
      } catch (e) {
        logFatal('App', 'Echec init au demarrage', e);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const tick = async () => {
      const activeUrl = await resolveBaseUrl();
      setIpPC(activeUrl);
      const ok = await testerConnexion();
      setPcConnecte(ok);
    };
    tick();
    const interval = setInterval(tick, CONNEXION_CHECK_MS);
    return () => clearInterval(interval);
  }, []);

  const traiterFileRef = useRef(traiterFile);
  useEffect(() => {
    traiterFileRef.current = traiterFile;
  }, [traiterFile]);

  useEffect(() => {
    const interval = setInterval(() => {
      traiterFileRef.current();
    }, QUEUE_TRAITEMENT_MS);
    return () => clearInterval(interval);
  }, [ipPC]);

  useEffect(() => {
    saveQueue(file);
  }, [file]);

  useEffect(() => {
    saveHistory(historique);
  }, [historique]);

  const construireEtEnvoyer = async (contenu: string, historyId: string) => {
    const resultat = await envoyerScan(contenu);
    if (resultat.statut === 'ok') {
      mettreAJourHistorique(historyId, {
        statut: 'envoye',
        envoyeLe: Date.now(),
        erreur: undefined,
      });
      vibrerSucces();
      return true;
    }
    mettreAJourHistorique(historyId, {
      statut: 'erreur',
      erreur: resultat.message,
    });
    vibrerErreur();
    return false;
  };

  const mettreEnFile = (contenu: string): HistoryEntry => {
    const entree: QueueEntry = {
      id: generateId(),
      contenu,
      creeLe: Date.now(),
    };
    const histEntry: HistoryEntry = { ...entree, statut: 'en_attente' };
    setFile((prev) => [...prev, entree]);
    ajouterHistorique(histEntry);
    return histEntry;
  };

  const handleValider = async () => {
    if (!nom.trim() || !prenom.trim()) {
      Alert.alert('Erreur', 'Merci de remplir ton nom et ton prenom.');
      return;
    }

    const nomMaj = nom.trim().toUpperCase();
    const prenomPropre = prenom.trim();
    const texteAEnvoyer = `${nomMaj} ${prenomPropre}`;

    setStatut('ENVOI');
    setStatutMsg('');

    if (!pcConnecte) {
      const entree = mettreEnFile(texteAEnvoyer);
      setNom('');
      setPrenom('');
      setStatut('QUEUED');
      setStatutMsg(
        `PC injoignable. Scan mis en file d'attente (${entree.contenu}).`,
      );
      vibrerErreur();
      setTimeout(() => setStatut('IDLE'), 4000);
      return;
    }

    const tempId = generateId();
    const histTemp: HistoryEntry = {
      id: tempId,
      contenu: texteAEnvoyer,
      creeLe: Date.now(),
      statut: 'en_attente',
    };
    ajouterHistorique(histTemp);

    const ok = await construireEtEnvoyer(texteAEnvoyer, tempId);
    if (ok) {
      setNom('');
      setPrenom('');
      setStatut('SUCCESS');
      setStatutMsg('Ton passage a bien ete enregistre. Merci !');
      setTimeout(() => setStatut('IDLE'), 3000);
    } else {
      const entree: QueueEntry = {
        id: tempId,
        contenu: texteAEnvoyer,
        creeLe: Date.now(),
      };
      setFile((prev) => [...prev, entree]);
      setStatut('QUEUED');
      setStatutMsg(
        'Envoi echoue. Scan mis en file d\'attente pour re-essai automatique.',
      );
      setTimeout(() => setStatut('IDLE'), 4000);
    }
  };

  const handleRenvoyerHistorique = async (entree: HistoryEntry) => {
    if (entree.statut === 'envoye') {
      Alert.alert('Info', 'Ce scan a deja ete envoye.');
      return;
    }
    const ok = await construireEtEnvoyer(entree.contenu, entree.id);
    if (ok) {
      setFile((prev) => prev.filter((q) => q.id !== entree.id));
    }
  };

  const handleViderHistorique = async () => {
    setHistorique([]);
    await clearHistoryStorage();
  };

  const handleTesterConnexionSettings = async () => {
    return testerConnexion();
  };

  const handleViderTout = async () => {
    Alert.alert(
      'Vider la file d\'attente ?',
      'Tous les scans en attente seront supprimes.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Vider',
          style: 'destructive',
          onPress: async () => {
            setFile([]);
            await clearQueueStorage();
          },
        },
      ],
    );
  };

  if (screen === 'settings') {
    return (
      <SettingsScreen
        theme={theme}
        version={appVersion}
        ipActuelle={ipPC}
        pcConnecte={pcConnecte}
        onClose={() => setScreen('main')}
        onViderHistorique={handleViderHistorique}
        onTesterConnexion={handleTesterConnexionSettings}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.background} />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.carteFormulaire}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.titrePrincipal}>
                Passage a l'infirmerie
              </Text>
            </View>
            {file.length > 0 && (
              <TouchableOpacity
                style={styles.badge}
                onPress={handleViderTout}
                accessibilityLabel={`${file.length} scans en attente`}
              >
                <Text style={styles.badgeTexte}>
                  {file.length} en attente
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.headerGear}
              onPress={() => setScreen('settings')}
              accessibilityLabel="Ouvrir les parametres"
            >
              <Text style={styles.headerGearTexte}>{'\u2699'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sousTitre}>
            Remplis bien les champs, puis clique sur Valider.
          </Text>

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
                ? `PC connecte (${ipPC})`
                : `PC injoignable (${ipPC})`}
            </Text>
          </View>

          <Text style={styles.label}>Ton nom de famille</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex : DUPONT"
            placeholderTextColor={theme.placeholder}
            value={nom}
            onChangeText={setNom}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Ton prenom</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex : Lea"
            placeholderTextColor={theme.placeholder}
            value={prenom}
            onChangeText={setPrenom}
            autoCapitalize="words"
          />

          <TouchableOpacity
            style={[
              styles.boutonValider,
              envoiEnCours && styles.boutonDesactive,
            ]}
            onPress={handleValider}
            activeOpacity={0.8}
            disabled={envoiEnCours}
          >
            <Text style={styles.texteBouton}>
              {envoiEnCours ? 'Envoi en cours...' : 'Valider mon passage'}
            </Text>
          </TouchableOpacity>

          {statut === 'SUCCESS' && (
            <View style={styles.messageSucces}>
              <Text style={styles.texteSucces}>
                {statutMsg ||
                  'Ton passage a bien ete enregistre. Merci !'}
              </Text>
            </View>
          )}

          {statut === 'QUEUED' && (
            <View
              style={[
                styles.messageErreur,
                { backgroundColor: theme.badge, borderColor: theme.badge },
              ]}
            >
              <Text
                style={[
                  styles.texteErreur,
                  { color: theme.badgeText },
                ]}
              >
                {statutMsg}
              </Text>
            </View>
          )}

          {statut === 'ERROR' && (
            <View style={styles.messageErreur}>
              <Text style={styles.texteErreur}>
                {statutMsg ||
                  'Erreur d\'envoi. Verifie la connexion Wi-Fi.'}
              </Text>
            </View>
          )}

          <View style={styles.historiqueSection}>
            <Text style={styles.historiqueTitre}>
              Mes derniers passages ({historique.length}/50)
            </Text>
            {historique.length === 0 ? (
              <Text style={styles.historiqueVide}>
                Aucun scan enregistre localement.
              </Text>
            ) : (
              historique.map((entree) => {
                const peutRenvoyer = entree.statut !== 'envoye';
                return (
                  <View key={entree.id} style={styles.historiqueItem}>
                    <View style={styles.historiqueContenu}>
                      <Text style={styles.historiqueTexte}>
                        {entree.contenu}
                      </Text>
                      <Text style={styles.historiqueMeta}>
                        {formatDate(entree.creeLe)}
                        {entree.envoyeLe
                          ? ` -> envoye a ${formatDate(entree.envoyeLe)}`
                          : ''}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.historiqueStatut,
                        entree.statut === 'envoye' &&
                          styles.historiqueStatutEnvoye,
                        entree.statut === 'en_attente' &&
                          styles.historiqueStatutAttente,
                        entree.statut === 'erreur' &&
                          styles.historiqueStatutErreur,
                      ]}
                    >
                      {entree.statut === 'envoye'
                        ? 'OK'
                        : entree.statut === 'en_attente'
                          ? 'Attente'
                          : 'Erreur'}
                    </Text>
                    {peutRenvoyer && (
                      <TouchableOpacity
                        style={styles.historiqueBouton}
                        onPress={() => handleRenvoyerHistorique(entree)}
                      >
                        <Text style={styles.historiqueBoutonTexte}>
                          Renvoyer
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const AppAvecBoundary = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

export default AppAvecBoundary;
