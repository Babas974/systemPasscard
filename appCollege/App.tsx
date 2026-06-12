// App.tsx
// App tablette college : formulaire de passage a l'infirmerie.
// UX simplifiee en 3 etapes : Nom → Prenom → Valider.
// Le bouton rond indique l'etat de connexion (vert/rouge).
// 6 taps sur le bouton rond = parametres.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Text,
  TextInput,
  View,
  TouchableOpacity,
  StatusBar,
  Vibration,
  AppState,
  AppStateStatus,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from './theme';
import { createStyles } from './styles';
import {
  envoyerScan,
  testerConnexion,
  setIP,
  getApiBaseUrl,
  resolveBaseUrl,
  getIP,
  initDeviceIP,
  isConnecte,
  getBackoffMs,
  onConnectionChange,
  resetBackoff,
} from './ApiService';
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

// --- Toast simple ---
interface ToastState {
  visible: boolean;
  message: string;
  type: 'succes' | 'erreur' | 'info';
}

function Toast({
  toast,
  onCache,
}: {
  toast: ToastState;
  onCache: () => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toast.visible) {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => onCache());
    }
  }, [toast.visible]);

  if (!toast.visible) return null;

  const bg =
    toast.type === 'succes'
      ? '#16a34a'
      : toast.type === 'erreur'
        ? '#dc2626'
        : '#3b82f6';

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        backgroundColor: bg,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 10,
        zIndex: 999,
        opacity,
        elevation: 8,
      }}
    >
      <Text style={{ color: '#fff', fontSize: 15, fontWeight: 'bold', textAlign: 'center' }}>
        {toast.message}
      </Text>
    </Animated.View>
  );
}

// --- ErrorBoundary ---
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
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e', padding: 24 }}>
          <Text style={{ color: '#e74c3c', fontSize: 20, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' }}>
            Oups, une erreur est survenue
          </Text>
          <Text style={{ color: '#ccc', fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
            {this.state.erreur.message || 'Erreur inconnue'}
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ erreur: null })}
            style={{ backgroundColor: '#3498db', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Recommencer</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

type Screen = 'main' | 'settings';

const QUEUE_TRAITEMENT_MS = 3000;

const vibrerSucces = () => Vibration.vibrate(60);
const vibrerErreur = () => {
  Vibration.vibrate(120);
  setTimeout(() => Vibration.vibrate(120), 200);
  setTimeout(() => Vibration.vibrate(120), 400);
};

export function App() {
  const theme = useTheme();
  const styles = createStyles(theme);

  const [screen, setScreen] = useState<Screen>('main');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [pcConnecte, setPcConnecte] = useState(false);
  const [ipPC, setIpPC] = useState('127.0.0.1');
  const [file, setFile] = useState<QueueEntry[]>([]);
  const [historique, setHistorique] = useState<HistoryEntry[]>([]);
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '', type: 'info' });
  const [latence, setLatence] = useState<number | null>(null);

  const traitementEnCours = useRef(false);
  const validationEnCours = useRef(false);
  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef(0);

  // --- Toast ---
  const afficherToast = useCallback((message: string, type: ToastState['type'] = 'info') => {
    setToast({ visible: true, message, type });
  }, []);
  const cacherToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  // --- 6 taps sur bouton rond → parametres ---
  const handleBoutonRondTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapTimeRef.current > 1000) {
      tapCountRef.current = 1;
    } else {
      tapCountRef.current += 1;
      if (tapCountRef.current >= 6) {
        setScreen('settings');
        tapCountRef.current = 0;
      }
    }
    lastTapTimeRef.current = now;
  }, []);

  // --- Historique ---
  const ajouterHistorique = useCallback((entree: HistoryEntry) => {
    setHistorique((prev) => [entree, ...prev].slice(0, 50));
  }, []);

  const mettreAJourHistorique = useCallback(
    (id: string, patch: Partial<HistoryEntry>) => {
      setHistorique((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    },
    [],
  );

  // --- File d'attente ---
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
        mettreAJourHistorique(entree.id, { statut: 'envoye', envoyeLe: Date.now(), erreur: undefined });
        vibrerSucces();
      } else {
        mettreAJourHistorique(entree.id, { statut: 'erreur', erreur: res.message });
      }
    } finally {
      traitementEnCours.current = false;
    }
  }, [file, mettreAJourHistorique]);

  // --- Init ---
  useEffect(() => {
    const init = async () => {
      try {
        logInfo('App', `Demarrage v${appVersion}`);
        await initDeviceIP();
        const savedIP = await loadIP();
        if (savedIP && savedIP !== '127.0.0.1') setIP(savedIP);
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

  // --- Connexion avec backoff ---
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let actif = true;

    const check = async () => {
      if (!actif) return;
      const start = Date.now();
      const activeUrl = await resolveBaseUrl();
      setIpPC(activeUrl);
      setPcConnecte(isConnecte());
      setLatence(Date.now() - start);
      const delay = getBackoffMs() || 3000;
      if (actif) timer = setTimeout(check, delay);
    };

    check();
    return () => {
      actif = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const unsub = onConnectionChange((ok) => setPcConnecte(ok));
    return unsub;
  }, []);

  const traiterFileRef = useRef(traiterFile);
  useEffect(() => {
    traiterFileRef.current = traiterFile;
  }, [traiterFile]);

  useEffect(() => {
    const interval = setInterval(() => traiterFileRef.current(), QUEUE_TRAITEMENT_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { saveQueue(file); }, [file]);
  useEffect(() => { saveHistory(historique); }, [historique]);

  // --- Reconnexion foreground (apres veille) ---
  useEffect(() => {
    let timerReconnexion: ReturnType<typeof setTimeout> | null = null;

    const handleAppStateChange = (next: AppStateStatus) => {
      if (next === 'active') {
        logInfo('App', 'Retour en foreground — reset backoff + reconnexion');
        // Reset immediat du backoff
        resetBackoff();
        setPcConnecte(false);

        // Delai 2s pour laisser le WiFi se stabiliser apres veille
        if (timerReconnexion) clearTimeout(timerReconnexion);
        timerReconnexion = setTimeout(async () => {
          // Forcer un scan reseau complet
          const url = await resolveBaseUrl();
          setIpPC(url);
          const ok = isConnecte();
          setPcConnecte(ok);
          logInfo('App', `Reconnexion post-veille: ${ok ? 'OK' : 'ECHEC'}`);

          // Traiter la file meme si pas encore connecte (pour les envois recents)
          if (ok) {
            traiterFileRef.current();
          }
        }, 2000);
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      sub.remove();
      if (timerReconnexion) clearTimeout(timerReconnexion);
    };
  }, []);

  // --- Validation en 2 etapes : Nom → Prenom/Valider ---
  const handleNomChange = (text: string) => {
    setNom(text);
  };

  const handlePrenomChange = (text: string) => {
    setPrenom(text);
  };

  const handleValider = async () => {
    if (validationEnCours.current) return;
    if (!nom.trim() || !prenom.trim()) return;

    validationEnCours.current = true;
    try {
      const nomMaj = nom.trim().toUpperCase();
      const prenomPropre = prenom.trim();
      const texteAEnvoyer = `${nomMaj} ${prenomPropre}`;

      if (!pcConnecte) {
        const entree: QueueEntry = { id: generateId(), contenu: texteAEnvoyer, creeLe: Date.now() };
        const histEntry: HistoryEntry = { ...entree, statut: 'en_attente' };
        setFile((prev) => [...prev, entree]);
        ajouterHistorique(histEntry);
        vibrerErreur();
        afficherToast(`PC injoignable. Mis en file (${entree.contenu})`, 'erreur');
        reset();
        return;
      }

      const tempId = generateId();
      const histTemp: HistoryEntry = { id: tempId, contenu: texteAEnvoyer, creeLe: Date.now(), statut: 'en_attente' };
      ajouterHistorique(histTemp);

      const resultat = await envoyerScan(texteAEnvoyer);
      if (resultat.statut === 'ok') {
        mettreAJourHistorique(tempId, { statut: 'envoye', envoyeLe: Date.now(), erreur: undefined });
        vibrerSucces();
        afficherToast('Passage enregistre ! Merci.', 'succes');
      } else {
        mettreAJourHistorique(tempId, { statut: 'erreur', erreur: resultat.message });
        const entree: QueueEntry = { id: tempId, contenu: texteAEnvoyer, creeLe: Date.now() };
        setFile((prev) => [...prev, entree]);
        vibrerErreur();
        afficherToast('Envoi echoue. Mis en file d\'attente.', 'erreur');
      }
      reset();
    } finally {
      validationEnCours.current = false;
    }
  };

  const reset = () => {
    setNom('');
    setPrenom('');
  };

  // --- Rendu parametres ---
  if (screen === 'settings') {
    return (
      <SettingsScreen
        theme={theme}
        version={appVersion}
        ipActuelle={ipPC}
        pcConnecte={pcConnecte}
        onClose={() => setScreen('main')}
        onViderHistorique={async () => { setHistorique([]); await clearHistoryStorage(); }}
        onTesterConnexion={testerConnexion}
        historique={historique}
      />
    );
  }

  // --- Rendu principal ---
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.background} />

      {/* Header : titre + bouton rond */}
      <View style={styles.headerRow}>
        <Text style={styles.titrePrincipal}>Passage a l'infirmerie</Text>
        <TouchableOpacity
          style={[
            styles.boutonRond,
            { backgroundColor: pcConnecte ? '#16a34a' : '#dc2626' },
          ]}
          onPress={handleBoutonRondTap}
          activeOpacity={0.7}
        />
      </View>

      {/* Nom */}
      <Text style={styles.label}>Nom de famille</Text>
      <TextInput
        style={styles.input}
        placeholder="NOM DE FAMILLE"
        placeholderTextColor={theme.placeholder}
        value={nom}
        onChangeText={handleNomChange}
        autoCapitalize="characters"
        autoFocus
      />

      {/* Prenom */}
      <Text style={styles.label}>Prenom</Text>
      <TextInput
        style={styles.input}
        placeholder="PRENOM"
        placeholderTextColor={theme.placeholder}
        value={prenom}
        onChangeText={handlePrenomChange}
        autoCapitalize="words"
      />

      {/* Valider */}
      {nom.trim().length > 0 && prenom.trim().length > 0 && (
        <TouchableOpacity
          style={styles.boutonValider}
          onPress={handleValider}
          activeOpacity={0.8}
        >
          <Text style={styles.texteBouton}>VALIDER</Text>
        </TouchableOpacity>
      )}

      {/* Toast */}
      <Toast toast={toast} onCache={cacherToast} />
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const AppAvecBoundary = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

export default AppAvecBoundary;
