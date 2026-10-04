import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { createAudioPlayer } from 'expo-audio';

// Change this value to 2, 3, or 4 to increase difficulty.
const TOTAL_OPTIONS = 2;

const INSTRUMENTS = [
  { id: 'piano', label: 'Piano', emoji: '\uD83C\uDFB9', sound: require('./assets/sounds/piano.wav') },
  { id: 'electric-guitar', label: 'Electric guitar', emoji: '\uD83C\uDFB8', sound: require('./assets/sounds/electric_guitar.wav') },
  { id: 'nylon-guitar', label: 'Nylon guitar', emoji: '\uD83C\uDFB8', sound: require('./assets/sounds/nylon_guitar.wav') },
  { id: 'flute', label: 'Flute', emoji: '\uD83E\uDE88', sound: require('./assets/sounds/flute.wav') },
  { id: 'recorder', label: 'Recorder', emoji: '\uD83E\uDE88', sound: require('./assets/sounds/recorder.wav') },
  { id: 'tenor-sax', label: 'Tenor sax', emoji: '\uD83C\uDFB7', sound: require('./assets/sounds/tenor_sax.wav') },
  { id: 'trumpet', label: 'Trumpet', emoji: '\uD83C\uDFBA', sound: require('./assets/sounds/trumpet.wav') },
  { id: 'violin', label: 'Violin', emoji: '\uD83C\uDFBB', sound: require('./assets/sounds/violin.wav') },
  { id: 'drums', label: 'Drums', emoji: '\uD83E\uDD41', sound: require('./assets/sounds/drums.wav') },
  { id: 'xylophone', label: 'Xylophone', emoji: '\uD83E\uDE87', sound: require('./assets/sounds/xylophone.wav') },
];

function shuffled(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function makeRound() {
  const [target, ...decoys] = shuffled(INSTRUMENTS);
  return {
    target,
    choices: shuffled([target, ...decoys.slice(0, TOTAL_OPTIONS - 1)]),
    id: `${Date.now()}-${Math.random()}`,
  };
}

function InstrumentButton({ instrument, disabled, onPress, success, choiceStyle }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!success) return;
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.16, useNativeDriver: true, speed: 22 }),
      Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, speed: 28 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 18 }),
    ]).start();
  }, [scale, success]);

  const pressIn = () => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 0.94, duration: 70, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.72, duration: 70, useNativeDriver: true }),
    ]).start();
  };

  const pressOut = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 24 }),
      Animated.timing(opacity, { toValue: 1, duration: 110, useNativeDriver: true }),
    ]).start();
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
          { opacity, transform: [{ scale }] },
        ]}
      >
        <Animated.Text style={styles.emoji}>{instrument.emoji}</Animated.Text>
        <Animated.Text style={styles.label}>{instrument.label}</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

export default function App() {
  const [round, setRound] = useState(null);
  const [phase, setPhase] = useState('audio');
  const [successId, setSuccessId] = useState(null);
  const soundRef = useRef(null);
  const soundSubscriptionRef = useRef(null);
  const nextRoundTimer = useRef(null);
  const mounted = useRef(true);

  const stopSound = () => {
    soundSubscriptionRef.current?.remove();
    soundSubscriptionRef.current = null;
    const activePlayer = soundRef.current;
    soundRef.current = null;
    if (!activePlayer) return;
    activePlayer.pause();
    activePlayer.remove();
  };

  const playClip = (source, onFinished) => {
    stopSound();
    try {
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
      stopSound();
      onFinished?.();
    }
  };

  useEffect(() => {
    mounted.current = true;
    setRound(makeRound());
    return () => {
      mounted.current = false;
      clearTimeout(nextRoundTimer.current);
      stopSound();
    };
  }, []);

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
    if (phase !== 'input') return;
    if (instrument.id !== round.target.id) {
      setPhase('teaching');
      await playClip(instrument.sound, () => {
        if (mounted.current) setPhase('input');
      });
      return;
    }

    setSuccessId(instrument.id);
    setPhase('success');
    nextRoundTimer.current = setTimeout(() => {
      if (!mounted.current) return;
      setSuccessId(null);
      setRound(makeRound());
      setPhase('audio');
    }, 2000);
  };

  const renderChoices = () => {
    if (TOTAL_OPTIONS === 2) {
      return (
        <View style={styles.twoChoices}>
          {round.choices.map((instrument) => (
            <InstrumentButton
              key={instrument.id}
              instrument={instrument}
              disabled={phase !== 'input'}
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
                disabled={phase !== 'input'}
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar hidden />
      <View style={styles.stage}>
        {round && renderChoices()}
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
  label: {
    color: '#26352C',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
});