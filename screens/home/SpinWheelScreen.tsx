import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Modal,
  Vibration,
} from "react-native";
import Svg, { Path, G, Text as SvgText, Circle, Line } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");
const WHEEL_SIZE = width - 48;
const R = WHEEL_SIZE / 2;
const STORAGE_KEY = "SPIN_WHEELS_STORE_V3";

const COLORS = [
  "#FF8A65", "#64B5F6", "#81C784", "#F06292", "#FFD54F",
  "#BA68C8", "#4DD0E1", "#A5D6A7", "#FF8A80", "#80DEEA",
];

const CONFETTI_COLORS = [
  "#FF6B6B", "#4ECDC4", "#FFE66D", "#A8E6CF", "#FF8B94",
  "#6C5CE7", "#00B894", "#FDCB6E", "#E17055", "#74B9FF",
];

const CONFETTI_SHAPES = ["square", "circle", "triangle", "rect"];

function toRad(deg) { return (deg * Math.PI) / 180; }

function getArcPath(cx, cy, r, startDeg, endDeg) {
  const start = toRad(startDeg - 90);
  const end = toRad(endDeg - 90);
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M${cx},${cy} L${x1},${y1} A${r},${r},0,${large},1,${x2},${y2} Z`;
}

function WheelSvg({ segments }) {
  const sliceAngle = 360 / segments.length;
  return (
    <Svg width={WHEEL_SIZE} height={WHEEL_SIZE} viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}>
      {segments.map((seg, i) => {
        const startDeg = i * sliceAngle;
        const endDeg = startDeg + sliceAngle;
        const midDeg = startDeg + sliceAngle / 2;
        const midRad = toRad(midDeg - 90);
        const labelR = R * 0.60;
        const lx = R + labelR * Math.cos(midRad);
        const ly = R + labelR * Math.sin(midRad);
        const labelRotation = midDeg > 180 ? midDeg - 180 : midDeg;
        const fontSize = segments.length > 7 ? 10 : segments.length > 5 ? 12 : 14;

        return (
          <G key={i}>
            <Path d={getArcPath(R, R, R - 6, startDeg, endDeg)} fill={COLORS[i % COLORS.length]} />
            <Line
              x1={R} y1={R}
              x2={R + (R - 6) * Math.cos(toRad(startDeg - 90))}
              y2={R + (R - 6) * Math.sin(toRad(startDeg - 90))}
              stroke="rgba(255,255,255,0.3)" strokeWidth={2}
            />
            <SvgText
              x={lx} y={ly}
              fontSize={fontSize} fontWeight="bold" fill="#1A1A1A"
              textAnchor="middle" alignmentBaseline="middle"
              transform={`rotate(${labelRotation}, ${lx}, ${ly})`}
            >
              {seg}
            </SvgText>
          </G>
        );
      })}
      <Circle cx={R} cy={R} r={R - 3} fill="none" stroke="#FFD700" strokeWidth={6} />
      <Circle cx={R} cy={R} r={30} fill="#1A1A2E" stroke="#40C4FF" strokeWidth={4} />
      <SvgText x={R} y={R + 8} fontSize={22} textAnchor="middle">⭐</SvgText>
    </Svg>
  );
}

function ConfettiPiece({ x, delay, color, shape }) {
  const anim = useRef(new Animated.Value(0)).current;
  const rotAnim = useRef(new Animated.Value(0)).current;
  const drift = (Math.random() - 0.5) * 200;

  React.useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(anim, { toValue: 1, duration: 2500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(rotAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-20, height * 0.85] });
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, drift] });
  const opacity = anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
  const rotate = rotAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${Math.random() > 0.5 ? "" : "-"}${360 + Math.random() * 360}deg`] });
  const size = 8 + Math.random() * 8;

  if (shape === "triangle") {
    return (
      <Animated.View
        style={{
          position: "absolute", left: x, top: 0, opacity,
          transform: [{ translateY }, { translateX }, { rotate }],
          width: 0, height: 0,
          borderLeftWidth: size / 2, borderRightWidth: size / 2, borderBottomWidth: size,
          borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: color,
        }}
      />
    );
  }

  return (
    <Animated.View
      style={{
        position: "absolute", left: x, top: 0,
        width: shape === "rect" ? size * 1.8 : size,
        height: shape === "rect" ? size * 0.7 : size,
        backgroundColor: color, opacity,
        borderRadius: shape === "circle" ? size / 2 : 0,
        transform: [{ translateY }, { translateX }, { rotate }],
      }}
    />
  );
}

function Confetti() {
  const pieces = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    x: Math.random() * width,
    delay: Math.random() * 600,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    shape: CONFETTI_SHAPES[Math.floor(Math.random() * CONFETTI_SHAPES.length)],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((p) => <ConfettiPiece key={p.id} {...p} />)}
    </View>
  );
}

async function saveHistory(wheelId, result) {
  const key = `SPIN_HISTORY_${wheelId}`;
  try {
    const raw = await AsyncStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    arr.push({ result, ts: Date.now() });
    await AsyncStorage.setItem(key, JSON.stringify(arr));
  } catch (e) { }
}

async function updateLastUsed(wheelId) {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const wheels = JSON.parse(raw);
    const updated = wheels.map((w) =>
      w.id === wheelId ? { ...w, lastUsed: Date.now() } : w
    );
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) { }
}

export default function SpinWheelScreen({ route, navigation }) {
  const wheel = route?.params?.wheel;
  const segments = wheel?.segments || [];
  const sliceAngle = 360 / segments.length;

  const rotationDeg = useRef(0);
  const animatedRot = useRef(new Animated.Value(0)).current;
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const resultAnim = useRef(new Animated.Value(0)).current;
  const resultSlideAnim = useRef(new Animated.Value(60)).current;

  if (!wheel) {
    return (
      <View style={styles.container}>
        <Text style={{ color: "#FFF" }}>No wheel data found</Text>
      </View>
    );
  }

  const handleSpin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setShowResult(false);
    setResult(null);
    resultAnim.setValue(0);
    resultSlideAnim.setValue(60);

    const winIndex = Math.floor(Math.random() * segments.length);
    const segCenter = winIndex * sliceAngle + sliceAngle / 2;
    const neededAngle = (360 - segCenter) % 360;
    const currentMod = rotationDeg.current % 360;
    let delta = neededAngle - currentMod;
    if (delta < 0) delta += 360;
    if (delta < 20) delta += 360;

    const totalRotation = rotationDeg.current + 8 * 360 + delta;
    animatedRot.setValue(rotationDeg.current);

    Animated.timing(animatedRot, {
      toValue: totalRotation,
      duration: 4500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(async () => {
      rotationDeg.current = totalRotation % 360;
      const winner = segments[winIndex];

      await saveHistory(wheel.id, winner);
      await updateLastUsed(wheel.id);

      setResult(winner);
      setIsSpinning(false);
      setShowResult(true);

      // ✅ Vibration instead of sound — no native linking needed
      Vibration.vibrate([0, 80, 60, 150]);

      Animated.parallel([
        Animated.spring(resultAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.spring(resultSlideAnim, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
      ]).start();
    });
  };

  const spin = animatedRot.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  const getResultColor = () => {
    const idx = segments.indexOf(result);
    return COLORS[idx % COLORS.length];
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080810" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => navigation.navigate("SpinHistory", { wheelId: wheel.id, segments })}
          >
            <Text style={{ fontSize: 16 }}>🕐</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showResult && result && <Confetti />}

      <View style={styles.topSection}>
        {!showResult ? (
          <View style={{ alignItems: "center" }}>
            <Text style={styles.title}>Spin The Wheel</Text>
            <Text style={styles.subtitle}>{wheel.title}</Text>
          </View>
        ) : (
          <Animated.View style={[{ alignItems: "center" }, { opacity: resultAnim, transform: [{ translateY: resultSlideAnim }] }]}>
            <Text style={styles.resultYourResult}>Your Result</Text>
            <Text style={[styles.resultName, { color: getResultColor() }]}>
              {result?.toUpperCase()}
            </Text>
          </Animated.View>
        )}
      </View>

      <View style={styles.wheelWrap}>
        <View style={styles.pointerWrap}>
          <View style={styles.pointer} />
        </View>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <WheelSvg segments={segments} />
        </Animated.View>
      </View>

      {!showResult ? (
        <TouchableOpacity
          style={[styles.spinBtn, isSpinning && { opacity: 0.6 }]}
          onPress={handleSpin}
          disabled={isSpinning}
          activeOpacity={0.85}
        >
          <Text style={styles.spinText}>
            {isSpinning ? "Spinning..." : "Tap to Spin"}
          </Text>
        </TouchableOpacity>
      ) : (
        <Animated.View
          style={[
            styles.bottomButtons,
            { opacity: resultAnim, transform: [{ translateY: resultSlideAnim }] },
          ]}
        >
          <TouchableOpacity style={styles.shareBtn}>
            <Text style={styles.shareIcon}>⬆️</Text>
            <Text style={styles.shareBtnText}>Share Result</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.spinAgainBtn}
            onPress={() => { setShowResult(false); setResult(null); }}
          >
            <Text style={styles.spinAgainText}>SPIN AGAIN</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#080810", alignItems: "center" },
  container: { flex: 1, backgroundColor: "#080810", alignItems: "center", justifyContent: "center" },
  header: {
    width: "100%", flexDirection: "row",
    justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4,
  },
  backBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "#1A1A2E", alignItems: "center", justifyContent: "center",
  },
  backText: { color: "#FFF", fontSize: 20 },
  headerRight: { flexDirection: "row", gap: 8 },
  headerIcon: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "#1A1A2E", alignItems: "center", justifyContent: "center",
  },
  topSection: {
    height: 90,
    marginTop: 40,
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  title: { color: "#FFF", fontSize: 26, fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.45)", fontSize: 15, marginTop: 6 },
  pointerWrap: { alignItems: "center", zIndex: 10, marginBottom: -14 },
  pointer: {
    width: 0, height: 0,
    borderLeftWidth: 14, borderRightWidth: 14, borderTopWidth: 30,
    borderLeftColor: "transparent", borderRightColor: "transparent",
    borderTopColor: "#7C3AED",
  },
  wheelWrap: { alignItems: "center", justifyContent: "center", zIndex: 2 },
  spinBtn: {
    position: "absolute", bottom: 36, left: 30, right: 30,
    backgroundColor: "#7C3AED", paddingVertical: 18,
    borderRadius: 50, alignItems: "center",
    zIndex: 10,
  },
  spinText: { color: "#FFF", fontSize: 18, fontWeight: "700" },
  resultYourResult: { color: "rgba(255,255,255,0.6)", fontSize: 16, fontWeight: "500", marginBottom: 4 },
  resultName: { fontSize: 42, fontWeight: "900", letterSpacing: 1, textAlign: "center" },
  bottomButtons: {
    position: "absolute", bottom: 36, left: 0, right: 0,
    paddingHorizontal: 24, gap: 12, zIndex: 10
  },
  shareBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 16, paddingVertical: 16, gap: 8,
  },
  shareIcon: { fontSize: 18 },
  shareBtnText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  spinAgainBtn: { backgroundColor: "#7C3AED", borderRadius: 50, paddingVertical: 18, alignItems: "center" },
  spinAgainText: { color: "#FFF", fontSize: 18, fontWeight: "800", letterSpacing: 1 },
});