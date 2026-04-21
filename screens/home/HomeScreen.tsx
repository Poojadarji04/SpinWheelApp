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
  ViewStyle,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import QuickPickerModal from './QuickPickerModal';
import { useFocusEffect } from '@react-navigation/native';

const STORAGE_KEY = 'SPIN_WHEELS_STORE_V3';

/* ── Design Tokens ── */
const T = {
  bg: '#05050F',
  surface: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  neon: '#CC88FF',
  neonB: '#44DDFF',
  neonG: '#44FFCC',
  text: '#F2F2F8',
  textDim: 'rgba(242,242,248,0.45)',
  textFaint: 'rgba(242,242,248,0.22)',
  danger: '#FF4D6D',
};

/* ── Types ── */
interface Palette {
  from: string;
  to: string;
  glow: string;
}

interface WheelItem {
  id: string;
  title: string;
  segments: string[];
  palette: Palette;
  lastUsed: number | null;
  spinCount?: number;
}

/* ── Card gradient pairs ── */
const CARD_PALETTES: Palette[] = [
  { from: 'rgba(120,40,220,0.28)', to: 'rgba(60,20,120,0.28)', glow: '#9B5CF6' },
  { from: 'rgba(20,180,200,0.28)', to: 'rgba(10,80,120,0.28)', glow: '#22D3EE' },
  { from: 'rgba(240,80,140,0.28)', to: 'rgba(100,20,80,0.28)', glow: '#F472B6' },
  { from: 'rgba(40,200,140,0.28)', to: 'rgba(10,80,60,0.28)', glow: '#34D399' },
  { from: 'rgba(240,160,40,0.28)', to: 'rgba(120,60,10,0.28)', glow: '#FBBF24' },
];

function randomPalette(): Palette {
  return CARD_PALETTES[Math.floor(Math.random() * CARD_PALETTES.length)];
}

/* ── Safe vibration ── */
function safeVibrate(pattern: number = 40): void {
  try {
    if (Platform.OS === 'android') Vibration.vibrate(pattern);
    else Vibration.vibrate();
  } catch (_) {}
}

function timeAgo(ts: number | null): string {
  if (!ts) return 'Never spun';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/* ──────────────── Icons ──────────────── */

interface IconProps {
  size?: number;
  color?: string;
}

function WheelIcon({ size = 22, color = T.neon }: IconProps) {
  const spokeLengthRatio = 0.68;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* outer ring */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2.2,
          borderColor: color,
          opacity: 0.9,
        }}
      />
      {/* spokes */}
      {[0, 45, 90, 135].map((deg: number) => (
        <View
          key={deg}
          style={{
            position: 'absolute',
            width: size * spokeLengthRatio,
            height: 1.8,
            backgroundColor: color,
            opacity: 0.7,
            transform: [{ rotate: `${deg}deg` }],
          }}
        />
      ))}
      {/* center hub */}
      <View
        style={{
          width: size * 0.22,
          height: size * 0.22,
          borderRadius: size,
          backgroundColor: color,
          opacity: 0.95,
        }}
      />
    </View>
  );
}

function TrashIcon({ size = 18, color = T.danger }: IconProps) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: s * 0.36, height: s * 0.1, backgroundColor: color, borderRadius: 4, marginBottom: 2 }} />
      <View style={{ width: s * 0.72, height: s * 0.12, backgroundColor: color, borderRadius: 4, marginBottom: 2 }} />
      <View
        style={{
          width: s * 0.58,
          height: s * 0.62,
          borderWidth: 1.8,
          borderColor: color,
          borderRadius: s * 0.1,
          borderTopWidth: 0,
          overflow: 'hidden',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          paddingHorizontal: s * 0.08,
        }}
      >
        {[0, 1, 2].map((i: number) => (
          <View
            key={i}
            style={{
              width: s * 0.07,
              height: s * 0.38,
              backgroundColor: color,
              borderRadius: 4,
              opacity: 0.8,
            }}
          />
        ))}
      </View>
    </View>
  );
}

function PlusIcon({ size = 16, color = '#fff' }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size, height: 2, backgroundColor: color, borderRadius: 2 }} />
      <View style={{ position: 'absolute', width: 2, height: size, backgroundColor: color, borderRadius: 2 }} />
    </View>
  );
}

function ChevronIcon({ size = 14, color = 'rgba(255,255,255,0.3)' }: IconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.55,
          height: size * 0.55,
          borderTopWidth: 2,
          borderRightWidth: 2,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
          marginLeft: -size * 0.15,
        }}
      />
    </View>
  );
}

/* ──────────────── Glow Dot ──────────────── */
interface GlowDotProps {
  color: string;
  style?: ViewStyle;
}

function GlowDot({ color, style }: GlowDotProps) {
  return (
    <View
      style={[
        {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
          shadowColor: color,
          shadowOpacity: 0.9,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 0 },
        },
        style,
      ]}
    />
  );
}

/* ──────────────── Segment Pills ──────────────── */
interface SegmentPillsProps {
  segments: string[];
  glowColor: string;
}

function SegmentPills({ segments, glowColor }: SegmentPillsProps) {
  const preview = segments.slice(0, 4);
  const more = segments.length - 4;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
      {preview.map((seg: string, i: number) => (
        <View
          key={i}
          style={{
            backgroundColor: glowColor + '20',
            borderWidth: 1,
            borderColor: glowColor + '40',
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 20,
          }}
        >
          <Text style={{ fontSize: 10, color: glowColor, fontWeight: '600' }} numberOfLines={1}>
            {seg}
          </Text>
        </View>
      ))}
      {more > 0 && (
        <View
          style={{
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 20,
          }}
        >
          <Text style={{ fontSize: 10, color: T.textDim, fontWeight: '600' }}>+{more}</Text>
        </View>
      )}
    </View>
  );
}

/* ──────────────── Wheel Card ──────────────── */
interface WheelCardProps {
  card: WheelItem;
  onDelete: (id: string) => void;
  navigation: any;
}

function WheelCard({ card, onDelete, navigation }: WheelCardProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const palette: Palette = card.palette || CARD_PALETTES[0];

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2800, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

const glowOpacity = glowAnim.interpolate({
  inputRange: [0, 1],
  outputRange: [0.05, 0.12], // ✅ subtle glow
});
  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    safeVibrate(18);
    navigation.navigate('SpinWheel', { wheel: card });
  };

  const handleDelete = () => {
    Alert.alert(
      'Remove Wheel',
      `Delete "${card.title}"? This cannot be undone.`,
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

  return (
    <TouchableOpacity activeOpacity={1} onPress={handlePress}>
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <Animated.View
          style={[styles.cardGlow, { backgroundColor: palette.glow, opacity: glowOpacity }]}
        />
        <View style={[styles.cardBody, { backgroundColor: palette.from }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <WheelIcon size={20} color={palette.glow} />
            </View>
            <View style={{ flex: 1 }} />
            <View style={styles.timeChip}>
              <GlowDot color={palette.glow} style={{ marginRight: 5 }} />
             <Text style={[styles.timeTxt, { color: palette.glow }]}>
  {timeAgo(card.lastUsed)}
</Text>
            </View>
          </View>

          <Text style={styles.cardTitle} numberOfLines={1}>
            {card.title}
          </Text>

          <SegmentPills segments={card.segments} glowColor={palette.glow} />

          <View style={styles.cardFooter}>
            <Text style={styles.spinCount}>
{card.spinCount
  ? `${card.spinCount} spins`
  : `Spin ${card.segments.length} times`}
</Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDelete}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <TrashIcon size={15} color={T.danger} />
              </TouchableOpacity>
              <View style={[styles.spinBtn, { borderColor: palette.glow + '60' }]}>
                <Text style={[styles.spinBtnTxt, { color: palette.glow }]}>Spin</Text>
                <ChevronIcon size={13} color={palette.glow} />
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

/* ──────────────── Empty State ──────────────── */
function EmptyState() {
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -10, duration: 1800, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.empty}>
      <Animated.View style={{ transform: [{ translateY: float }], marginBottom: 24 }}>
        <View style={styles.emptyIconRing}>
          <WheelIcon size={48} color={T.neon} />
        </View>
      </Animated.View>
      <Text style={styles.emptyTitle}>No Wheels Yet</Text>
      <Text style={styles.emptySub}>Create your first spin wheel and let fate decide.</Text>
      <View style={styles.emptyHint}>
        <PlusIcon size={12} color={T.neon} />
        <Text style={[styles.emptySub, { marginLeft: 6, color: T.neon, marginTop: 0 }]}>
          Tap Create Wheel below
        </Text>
      </View>
    </View>
  );
}

/* ──────────────── Stats Bar ──────────────── */
interface StatsBarProps {
  count: number;
  totalSpins: number;
}
function StatsBar({ count, totalSpins }: StatsBarProps) {
  return (
    <View style={styles.statsBar}>
      <View style={styles.statItem}>
        <Text style={styles.statNum}>{count}</Text>
        <Text style={styles.statLabel}>Wheels</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
       <Text style={[styles.statNum, { color: T.neonG }]}>
  {totalSpins}
</Text>
<Text style={styles.statLabel}>Total Spins</Text>
      </View>
    </View>
  );
}

/* ──────────────── Home Screen ──────────────── */
interface HomeScreenProps {
  navigation: any;
}

export default function SpinWheelHome({ navigation }: HomeScreenProps) {
  const [wheels, setWheels] = useState<WheelItem[]>([]);
  const [modal, setModal] = useState<boolean>(false);
  const [ready, setReady] = useState<boolean>(false);

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed: WheelItem[] = JSON.parse(raw);
            const migrated = parsed.map((w: WheelItem) =>
              w.palette ? w : { ...w, palette: randomPalette() }
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

  const handleCreate = useCallback(({ title, segments }: { title: string; segments: string[] }) => {
    setWheels((prev: WheelItem[]) => [
      {
        id: Date.now().toString(),
        title,
        segments,
        palette: randomPalette(),
        lastUsed: null,
      },
      ...prev,
    ]);
    setModal(false);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setWheels((prev: WheelItem[]) => prev.filter((w: WheelItem) => w.id !== id));
  }, []);

  const headerTranslate = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] });

  return (
<SafeAreaView style={[styles.safe, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      <StatusBar barStyle="light-content" backgroundColor={T.bg} />

      <View style={styles.orbTopLeft} />
      <View style={styles.orbBottomRight} />

      <Animated.View
        style={[
          styles.header,
          { opacity: headerAnim, transform: [{ translateY: headerTranslate }] },
        ]}
      >
        <View>
          {/* <Text style={styles.headerEyebrow}>YOUR COLLECTION</Text> */}
          <Text style={styles.headerTitle}>Spin Wheel</Text>
        </View>
        {/* <View style={styles.headerBadge}>
          <WheelIcon size={18} color={T.neon} />
        </View> */}
      </Animated.View>

<StatsBar
  count={wheels.length}
  totalSpins={wheels.reduce((sum, w) => sum + (w.spinCount || 0), 0)}
/>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {wheels.length === 0 ? (
          <EmptyState />
        ) : (
          wheels.map((w: WheelItem, i: number) => (
            <Animated.View
              key={w.id}
              style={{
                opacity: headerAnim,
                transform: [
                  {
                    translateY: headerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30 + i * 10, 0],
                    }),
                  },
                ],
              }}
            >
              <WheelCard card={w} onDelete={handleDelete} navigation={navigation} />
            </Animated.View>
          ))
        )}
        <View style={{ height: 130 }} />
      </ScrollView>

      <View style={styles.fabWrap}>
        <View style={styles.fabGlow} />
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            safeVibrate(20);
            setModal(true);
          }}
          activeOpacity={0.85}
        >
          <PlusIcon size={16} color="#fff" />
          <Text style={styles.fabText}>Create Wheel</Text>
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
  safe: { flex: 1, backgroundColor: T.bg },

  orbTopLeft: {
    position: 'absolute', top: -80, left: -80,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(120,40,220,0.12)',
  },
  orbBottomRight: {
    position: 'absolute', bottom: 80, right: -60,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(20,180,200,0.10)',
  },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 22, paddingTop: 12, paddingBottom: 8,
  },
  headerEyebrow: {
    fontSize: 10, fontWeight: '700', letterSpacing: 2.5,
    color: T.textFaint, marginBottom: 3,
  },
  headerTitle: {
    fontSize: 30, fontWeight: '900', color: T.text, letterSpacing: -0.5,
  },
  headerBadge: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: 'rgba(200,136,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(200,136,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },

  statsBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 22, marginBottom: 14,
    backgroundColor: T.surface, borderRadius: 16,
    borderWidth: 1, borderColor: T.border,
    paddingVertical: 12, paddingHorizontal: 20,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800', color: T.neon, letterSpacing: -0.3 },
  statLabel: { fontSize: 11, color: T.textFaint, fontWeight: '500', marginTop: 2, letterSpacing: 0.5 },
  statDivider: { width: 1, height: 36, backgroundColor: T.border, marginHorizontal: 16 },

  list: { paddingHorizontal: 16, paddingTop: 4 },

card: {
  borderRadius: 22,
  position: 'relative',
  overflow: 'hidden',
  marginBottom: 14, // ✅ space between cards

},
cardGlow: {
  position: 'absolute',
  top: 6,
  left: 6,
  right: 6,
  bottom: 6,
  borderRadius: 18,
},
  cardBody: {
    borderRadius: 22, padding: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', overflow: 'hidden',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  timeChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  timeTxt: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  cardTitle: {
    fontSize: 21, fontWeight: '800', color: T.text, letterSpacing: -0.3, marginBottom: 2,
  },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 14, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  segCount: { fontSize: 12, color: T.textFaint, fontWeight: '500' },
  deleteBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,77,109,0.10)',
    borderWidth: 1, borderColor: 'rgba(255,77,109,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  spinBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  spinBtnTxt: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIconRing: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 1.5, borderColor: 'rgba(200,136,255,0.25)',
    backgroundColor: 'rgba(200,136,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 24, fontWeight: '800', color: T.text, letterSpacing: -0.3, marginBottom: 8,
  },
  spinCount: {
  fontSize: 13,
  color: '#FFFFFF',
  fontWeight: '700',
  letterSpacing: 0.3,
},
  emptySub: {
    fontSize: 14, color: T.textDim, textAlign: 'center',
    lineHeight: 20, marginTop: 0, paddingHorizontal: 36,
  },
  emptyHint: {
    flexDirection: 'row', alignItems: 'center', marginTop: 24,
    backgroundColor: 'rgba(200,136,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(200,136,255,0.2)',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },

  fabWrap: { position: 'absolute', bottom: 32, left: 0, right: 0, alignItems: 'center' },
  fabGlow: {
    position: 'absolute', bottom: -4,
    width: 180, height: 50, borderRadius: 50,
    backgroundColor: 'rgba(120,40,220,0.35)',
  },
  fab: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 32, paddingVertical: 16, borderRadius: 50,
    borderWidth: 1, borderColor: 'rgba(200,136,255,0.3)',
    shadowColor: '#7C3AED', shadowOpacity: 0.6,
    shadowRadius: 20, shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  fabText: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
});