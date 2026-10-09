import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  Animated,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { createAudioPlayer, setIsAudioActiveAsync } from 'expo-audio';
import { NavigationBar } from 'expo-navigation-bar';
import { useFonts } from 'expo-font';
import { Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';

// Change this value to 2, 3, or 4 to increase difficulty.
const TOTAL_OPTIONS = 2;
const INCORRECT_PREVIEW_MS = 3000;

const INSTRUMENTS = [
  { id: 'piano', label: 'Piano', image: require('./assets/symbols/piano.png'), sound: require('./assets/sounds/piano.wav') },
  { id: 'accordion', label: 'Accordion', image: require('./assets/symbols/accordion.png'), sound: require('./assets/sounds/accordion.wav') },
  { id: 'cello', label: 'Cello', image: require('./assets/symbols/cello.png'), sound: require('./assets/sounds/cello.wav') },
  { id: 'clarinet', label: 'Clarinet', image: require('./assets/symbols/clarinet.png'), sound: require('./assets/sounds/clarinet.wav') },
  { id: 'darbuka', label: 'Darbuka', image: require('./assets/symbols/darbuka.png'), sound: require('./assets/sounds/darbuka.wav') },
  { id: 'double-bass', label: 'Double bass', image: require('./assets/symbols/double_bass.png'), sound: require('./assets/sounds/double_bass.wav') },
  { id: 'electric-guitar', label: 'Electric guitar', image: require('./assets/symbols/electric_guitar.png'), sound: require('./assets/sounds/electric_guitar.wav') },
  { id: 'harmonica', label: 'Harmonica', image: require('./assets/symbols/harmonica.png'), sound: require('./assets/sounds/harmonica.wav') },
  { id: 'harp', label: 'Harp', image: require('./assets/symbols/harp.png'), sound: require('./assets/sounds/harp.wav') },
  { id: 'maracas', label: 'Maracas', image: require('./assets/symbols/maracas.png'), sound: require('./assets/sounds/maracas.wav') },
  { id: 'nylon-guitar', label: 'Nylon guitar', image: require('./assets/symbols/nylon_guitar.png'), sound: require('./assets/sounds/nylon_guitar.wav') },
  { id: 'flute', label: 'Flute', image: require('./assets/symbols/flute.png'), sound: require('./assets/sounds/flute.wav') },
  { id: 'recorder', label: 'Recorder', image: require('./assets/symbols/recorder.png'), sound: require('./assets/sounds/recorder.wav') },
  { id: 'tenor-sax', label: 'Tenor sax', image: require('./assets/symbols/tenor_sax.png'), sound: require('./assets/sounds/tenor_sax.wav') },
  { id: 'trumpet', label: 'Trumpet', image: require('./assets/symbols/trumpet.png'), sound: require('./assets/sounds/trumpet.wav') },
  { id: 'triangle', label: 'Triangle', image: require('./assets/symbols/triangle.png'), sound: require('./assets/sounds/triangle.wav') },
  { id: 'violin', label: 'Violin', image: require('./assets/symbols/violin.png'), sound: require('./assets/sounds/violin.wav') },
  { id: 'drums', label: 'Drums', image: require('./assets/symbols/drums.png'), sound: require('./assets/sounds/drums.wav') },
  { id: 'xylophone', label: 'Xylophone', image: require('./assets/symbols/xylophone.png'), sound: require('./assets/sounds/xylophone.wav') },
];

function shuffled(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function makeRound(previousChoiceIds = []) {
  const available = INSTRUMENTS.filter(({ id }) => !previousChoiceIds.includes(id));
  const [target, ...decoys] = shuffled(available);
  return {
    target,
    choices: shuffled([target, ...decoys.slice(0, TOTAL_OPTIONS - 1)]),
    id: `${Date.now()}-${Math.random()}`,
  };
}

function InstrumentButton({ instrument, disabled, onPress, success, choiceStyle }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!success) return;
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.16, useNativeDriver: true, speed: 22 }),
      Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, speed: 28 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 18 }),
    ]).start();
  }, [scale, success]);

  const pressIn = () => {
    Animated.timing(scale, { toValue: 0.94, duration: 70, useNativeDriver: true }).start();
  };

  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 24 }).start();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={instrument.label}
      disabled={disabled}
      onPressIn={pressIn}
      onPressOut={pressOut}
      onPress={() => onPress(instrument)}
      style={[styles.choice, choiceStyle]}
    >
      <Animated.View
        style={[
          styles.instrument,
          { transform: [{ scale }] },
        ]}
      >
        <Animated.Image source={instrument.image} resizeMode="contain" style={styles.instrumentImage} />
        <Animated.Text style={styles.label}>{instrument.label}</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Fredoka: Fredoka_600SemiBold,
    FredokaBold: Fredoka_700Bold,
  });
  const [round, setRound] = useState(null);
  const [screen, setScreen] = useState('menu');
  const [roundNumber, setRoundNumber] = useState(1);
  const [phase, setPhase] = useState('audio');
  const [successId, setSuccessId] = useState(null);
  const soundRef = useRef(null);
  const soundSubscriptionRef = useRef(null);
  const playRequestRef = useRef(0);
  const teachingTimer = useRef(null);
  const nextRoundTimer = useRef(null);
  const mounted = useRef(true);

  const stopSound = () => {
    playRequestRef.current += 1;
    soundSubscriptionRef.current?.remove();
    soundSubscriptionRef.current = null;
    const activePlayer = soundRef.current;
    soundRef.current = null;
    if (!activePlayer) return;
    activePlayer.pause();
    activePlayer.remove();
  };

  const playClip = async (source, onFinished) => {
    stopSound();
    const playRequest = playRequestRef.current;
    try {
      await setIsAudioActiveAsync(true);
      if (playRequestRef.current !== playRequest) return;
      const player = createAudioPlayer(source, { downloadFirst: true });
      soundRef.current = player;
      const subscription = player.addListener('playbackStatusUpdate', (status) => {
        if (!status.didJustFinish && !status.error) return;
        subscription.remove();
        if (soundRef.current === player) {
          soundRef.current = null;
          soundSubscriptionRef.current = null;
        }
        player.remove();
        onFinished?.();
      });
      soundSubscriptionRef.current = subscription;
      player.play();
    } catch (_error) {
      if (playRequestRef.current !== playRequest) return;
      stopSound();
      onFinished?.();
    }
  };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(teachingTimer.current);
      clearTimeout(nextRoundTimer.current);
      stopSound();
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setIsAudioActiveAsync(true).catch(() => {});
      }
    });
    return () => subscription.remove();
  }, []);

  const startGame = () => {
    clearTimeout(teachingTimer.current);
    clearTimeout(nextRoundTimer.current);
    stopSound();
    setRoundNumber(1);
    setSuccessId(null);
    setPhase('audio');
    setRound(makeRound());
    setScreen('game');
  };

  const returnToMenu = () => {
    clearTimeout(teachingTimer.current);
    teachingTimer.current = null;
    clearTimeout(nextRoundTimer.current);
    nextRoundTimer.current = null;
    stopSound();
    setSuccessId(null);
    setRound(null);
    setRoundNumber(1);
    setPhase('audio');
    setScreen('menu');
  };

  useEffect(() => {
    if (!round || phase !== 'audio') return undefined;
    let cancelled = false;
    playClip(round.target.sound, () => {
      if (!cancelled && mounted.current) setPhase('input');
    });
    return () => {
      cancelled = true;
    };
  }, [round, phase]);

  const handleChoice = async (instrument) => {
    if (phase !== 'input' && phase !== 'audio') return;
    if (instrument.id !== round.target.id) {
      setPhase('teaching');
      const finishTeaching = () => {
        clearTimeout(teachingTimer.current);
        teachingTimer.current = null;
        if (mounted.current) setPhase('input');
      };
      teachingTimer.current = setTimeout(() => {
        teachingTimer.current = null;
        stopSound();
        finishTeaching();
      }, INCORRECT_PREVIEW_MS);
      await playClip(instrument.sound, () => {
        finishTeaching();
      });
      return;
    }

    stopSound();
    setSuccessId(instrument.id);
    setPhase('success');
    playClip(require('./assets/sounds/success.wav'), () => {
      if (!mounted.current) return;
      nextRoundTimer.current = setTimeout(() => {
        setSuccessId(null);
        if (roundNumber === 10) {
          setRound(null);
          setScreen('menu');
          setRoundNumber(1);
          return;
        }
        setRoundNumber(roundNumber + 1);
        setRound(makeRound(round.choices.map(({ id }) => id)));
        setPhase('audio');
      }, 2000);
    });
  };

  const renderChoices = () => {
    if (TOTAL_OPTIONS === 2) {
      return (
        <View style={styles.twoChoices}>
          {round.choices.map((instrument) => (
            <InstrumentButton
              key={instrument.id}
              instrument={instrument}
              disabled={phase !== 'input' && phase !== 'audio'}
              onPress={handleChoice}
              success={successId === instrument.id}
            />
          ))}
        </View>
      );
    }

    const rows = TOTAL_OPTIONS === 3
      ? [round.choices.slice(0, 2), round.choices.slice(2)]
      : [round.choices.slice(0, 2), round.choices.slice(2, 4)];

    return (
      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View
            key={rowIndex}
            style={[styles.gridRow, TOTAL_OPTIONS === 3 && rowIndex === 1 && styles.centeredRow]}
          >
            {row.map((instrument) => (
              <InstrumentButton
                key={instrument.id}
                instrument={instrument}
                disabled={phase !== 'input' && phase !== 'audio'}
                onPress={handleChoice}
                success={successId === instrument.id}
                choiceStyle={TOTAL_OPTIONS === 3 && rowIndex === 1 && styles.centeredChoice}
              />
            ))}
          </View>
        ))}
      </View>
    );
  };

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar hidden />
      {Platform.OS === 'android' && <NavigationBar hidden />}
      <View style={styles.stage}>
        {screen === 'menu' ? (
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>Tom's Tunes</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start instrument identification game"
              onPress={startGame}
              style={({ pressed }) => [styles.gameTile, pressed && styles.gameTilePressed]}
            >
              <Text style={styles.musicNotes}>♫</Text>
              <Text style={styles.gameTileTitle}>Instrument sounds</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.game}>
            <View style={styles.gameHeader}>
              <Text style={styles.roundLabel}>Round {roundNumber} of 10</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Return to main menu"
                onPress={returnToMenu}
                style={({ pressed }) => [styles.menuButton, pressed && styles.menuButtonPressed]}
              >
                <Text style={styles.menuButtonText}>Menu</Text>
              </Pressable>
            </View>
            {round && renderChoices()}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#D8F3E2',
  },
  stage: {
    flex: 1,
    paddingHorizontal: 28,
    paddingVertical: 20,
  },
  menu: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  menuTitle: {
    color: '#26352C',
    fontFamily: 'FredokaBold',
    fontSize: 36,
  },
  gameTile: {
    width: 260,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: '#F2C14E',
    backgroundColor: '#FFFDF6',
  },
  gameTilePressed: {
    opacity: 0.78,
    transform: [{ scale: 0.97 }],
  },
  musicNotes: {
    color: '#32745A',
    fontSize: 72,
    fontWeight: '700',
    lineHeight: 82,
  },
  gameTileTitle: {
    color: '#26352C',
    fontFamily: 'Fredoka',
    fontSize: 20,
    textAlign: 'center',
  },
  game: {
    flex: 1,
  },
  gameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  roundLabel: {
    color: '#26352C',
    fontFamily: 'Fredoka',
    fontSize: 16,
  },
  menuButton: {
    minWidth: 76,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#32745A',
    borderRadius: 14,
    backgroundColor: '#FFFDF6',
  },
  menuButtonPressed: {
    opacity: 0.72,
  },
  menuButtonText: {
    color: '#32745A',
    fontFamily: 'FredokaBold',
    fontSize: 16,
  },
  twoChoices: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    columnGap: 32,
  },
  grid: {
    flex: 1,
    rowGap: 20,
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
    columnGap: 28,
  },
  centeredRow: {
    justifyContent: 'center',
  },
  choice: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  centeredChoice: {
    flex: 0,
    width: '48%',
  },
  instrument: {
    width: '100%',
    height: '100%',
    maxWidth: 360,
    maxHeight: 360,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    backgroundColor: '#FFFDF6',
    borderWidth: 5,
    borderColor: '#F2C14E',
    elevation: 5,
  },
  emoji: {
    fontSize: 112,
    textAlign: 'center',
  },
  instrumentImage: {
    width: '78%',
    height: '72%',
    maxWidth: 280,
    maxHeight: 260,
  },
  label: {
    color: '#26352C',
    fontFamily: 'Fredoka',
    fontSize: 20,
    textAlign: 'center',
  },
});