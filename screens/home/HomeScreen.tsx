import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Animated,
  Alert,
  Platform,
  Vibration,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import QuickPickerModal from './QuickPickerModal';
import { useFocusEffect } from '@react-navigation/native';

const STORAGE_KEY = 'SPIN_WHEELS_STORE_V3';

const THEME = {
  bg: '#001E3C',
  accent: '#40C4FF',
};

/* ── 5 card background colours that suit the dark-blue theme ── */
const CARD_COLORS = [
  '#0D3B6E', // cobalt blue
  '#1A1A4E', // deep indigo
  '#0E3D2F', // dark teal-green
  '#3B1F5E', // deep violet
  '#1E3A2F', // forest teal
];

function randomCardColor() {
  return CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)];
}

function getReadableTextColor(bgColor) {
  // convert hex to RGB
  const r = parseInt(bgColor.substr(1, 2), 16);
  const g = parseInt(bgColor.substr(3, 2), 16);
  const b = parseInt(bgColor.substr(5, 2), 16);

  // luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b);

  return luminance > 150 ? "#000" : "#FFF";
}

/* ── Safe vibration helper – avoids Android crash ── */
function safeVibrate(pattern = 40) {
  try {
    if (Platform.OS === 'android') {
      Vibration.vibrate(pattern);
    } else {
      Vibration.vibrate();
    }
  } catch (_) {
    // vibration not available – silently ignore
  }
}

function timeAgo(ts) {
  if (!ts) return 'Never';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/* ──────────────── Trash Icon ──────────────── */
function TrashIcon({ color = '#FF5C5C', size = 18 }) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      {/* lid */}
      <View
        style={{
          width: s * 0.72,
          height: s * 0.14,
          backgroundColor: color,
          borderRadius: s * 0.06,
          marginBottom: s * 0.04,
        }}
      />
      {/* body */}
      <View
        style={{
          width: s * 0.56,
          height: s * 0.64,
          borderWidth: s * 0.1,
          borderColor: color,
          borderRadius: s * 0.08,
          borderTopWidth: 0,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          paddingHorizontal: s * 0.06,
          overflow: 'hidden',
        }}
      >
        {/* inner lines */}
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              width: s * 0.07,
              height: s * 0.38,
              backgroundColor: color,
              borderRadius: s * 0.04,
            }}
          />
        ))}
      </View>
    </View>
  );
}

/* ──────────────── Card ──────────────── */
function WheelCard({ card, onDelete, navigation }) {
  const scale = useRef(new Animated.Value(1)).current;

  const bounce = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 70, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 70, useNativeDriver: true }),
    ]).start();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Wheel',
      `Remove "${card.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            safeVibrate(30);
            onDelete(card.id);
          },
        },
      ]
    );
  };

const cardBg = card.cardColor || CARD_COLORS[0];
const textColor = getReadableTextColor(cardBg);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => {
        bounce();
        safeVibrate(20);
        navigation.navigate('SpinWheel', { wheel: card });
      }}
    >
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <View style={[styles.cardInner, { backgroundColor: cardBg }]}>
          {/* left content */}
         <View style={styles.cardLeft}>
  <Text
    style={[styles.cardTitle, { color: textColor }]}
    numberOfLines={1}
  >
    {card.title}
  </Text>

  <Text
    style={[styles.cardMeta, { color: textColor + "CC" }]} // ~80% opacity
  >
    Used: {timeAgo(card.lastUsed)}
  </Text>

  <Text
    style={[styles.cardSlices, { color: textColor + "99" }]} // ~60% opacity
    numberOfLines={1}
  >
    {card.segments.join("  ·  ")}
  </Text>
</View>

          {/* trash button */}
          <TouchableOpacity
            style={styles.trashBtn}
            onPress={handleDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <TrashIcon color="#FF5C5C" size={20} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

/* ──────────────── Empty State ──────────────── */
function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>No Wheels Yet</Text>
      <Text style={styles.emptySub}>Tap + Create Wheel to add your first spin wheel.</Text>
    </View>
  );
}

/* ──────────────── Home Screen ──────────────── */
export default function SpinWheelHome({ navigation }) {
  const [wheels, setWheels] = useState([]);
  const [modal, setModal] = useState(false);
  const [ready, setReady] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            // backfill cardColor for wheels saved before this feature
            const migrated = parsed.map((w) =>
              w.cardColor ? w : { ...w, cardColor: randomCardColor() }
            );
            setWheels(migrated);
          }
        } catch (err) {
          console.warn(err);
        } finally {
          setReady(true);
        }
      })();
    }, [])
  );

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(wheels));
  }, [wheels, ready]);

  const handleCreate = useCallback(({ title, segments }) => {
    setWheels((prev) => [
      {
        id: Date.now().toString(),
        title,
        segments,
        bg: THEME.bg,
        accent: THEME.accent,
        cardColor: randomCardColor(), // ← random colour assigned here
        lastUsed: null,
      },
      ...prev,
    ]);
    setModal(false);
  }, []);

  const handleDelete = useCallback((id) => {
    setWheels((prev) => prev.filter((w) => w.id !== id));
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080810" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Spin Wheel</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {wheels.length === 0 ? (
          <EmptyState />
        ) : (
          wheels.map((w) => (
            <WheelCard
              key={w.id}
              card={w}
              onDelete={handleDelete}
              navigation={navigation}
            />
          ))
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.fabWrap}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setModal(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.fabText}>+ Create Wheel</Text>
        </TouchableOpacity>
      </View>

      <QuickPickerModal
        visible={modal}
        onClose={() => setModal(false)}
        onConfirm={handleCreate}
      />
    </SafeAreaView>
  );
}

/* ──────────────── Styles ──────────────── */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#080810',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF',
  },

  list: {
    paddingHorizontal: 16,
    paddingTop: 6,
    gap: 14,
  },

  card: {
    borderRadius: 20,
    overflow: 'hidden',
  },

  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 110,
    paddingLeft: 20,
    paddingRight: 16,
    paddingVertical: 18,
    borderRadius: 20,
    // subtle border to separate cards
    borderWidth: 1,
    borderColor: 'rgba(64,196,255,0.10)',
  },

  cardLeft: {
    flex: 1,
    paddingRight: 12,
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },

  cardMeta: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },

  cardSlices: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.22)',
    marginTop: 4,
  },

  trashBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,92,92,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,92,92,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  fabWrap: {
    position: 'absolute',
    bottom: 28,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  fab: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 50,
  },

  fabText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 10,
  },

  emptySub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
  },
});