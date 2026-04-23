import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,

  StatusBar,
  ScrollView,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const COLORS = [
  "#FF8A65", "#64B5F6", "#81C784", "#F06292", "#FFD54F",
  "#BA68C8", "#4DD0E1", "#A5D6A7", "#FF8A80", "#80DEEA",
];
import * as Analytics from '../home/analytics';
import { SafeAreaView } from "react-native-safe-area-context";


function timeAgo(ts) {
  if (!ts) return "Never";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "Recently";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function SpinHistoryScreen({ route, navigation }) {
  const { wheelId, segments } = route.params;
  const HISTORY_KEY = `SPIN_HISTORY_${wheelId}`;
  const [tab, setTab] = useState("HISTORY");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch (e) { }
  };

  const clearHistory = () => {
    Alert.alert("Clear History", "Delete all spin history for this wheel?", [
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem(HISTORY_KEY);
          setHistory([]);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // Stats: count per segment
  const stats = segments.reduce((acc, seg) => {
    acc[seg] = history.filter((h) => h.result === seg).length;
    return acc;
  }, {});
  const statsArr = Object.entries(stats)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  const getColor = (name) => {
    const idx = segments.indexOf(name);
    return COLORS[idx % COLORS.length];
  };

  return (
    <SafeAreaView style={styles.safe}>


      <StatusBar barStyle="light-content" backgroundColor="#080810" />

      <View style={styles.orbTopLeft} />
      <View style={styles.orbBottomRight} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Spin History</Text>
        <TouchableOpacity style={styles.deleteBtn} onPress={clearHistory}>
          <Text style={styles.deleteIcon}>🗑</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {["HISTORY", "STATS"].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {tab === "HISTORY" ? (
          history.length === 0 ? (
            <Text style={styles.empty}>No spins yet!</Text>
          ) : (
            [...history].reverse().map((item, i) => (
              <View key={item.ts} style={styles.row}>
                <Text style={styles.spinLabel}>Spin {history.length - i}</Text>
                <View style={[styles.badge, { backgroundColor: getColor(item.result) }]}>
                  <Text style={styles.badgeText}>{item.result}</Text>
                </View>
                <Text style={styles.timeText}>{timeAgo(item.ts)}</Text>
              </View>
            ))
          )
        ) : (
          statsArr.length === 0 ? (
            <Text style={styles.empty}>No stats yet!</Text>
          ) : (
            statsArr.map(([name, count]) => (
              <View key={name} style={styles.row}>
                <Text style={styles.trophy}>🏆</Text>
                <View style={[styles.badge, { backgroundColor: getColor(name) }]}>
                  <Text style={styles.badgeText}>{name}</Text>
                </View>
                <Text style={styles.timeText}>
                  Rolled {count} Time{count !== 1 ? "s" : ""}
                </Text>
              </View>
            ))
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#080810" },
  orbTopLeft: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(120,40,220,0.12)',
  },

  orbBottomRight: {
    position: 'absolute',
    bottom: 80,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(20,180,200,0.10)',
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  backBtn: {
    paddingHorizontal: 10, height: 42, borderRadius: 21,
    backgroundColor: "#1A1A2E",
    alignItems: "center", justifyContent: "center",
  },
  backText: { color: "#FFF", fontSize: 16 },
  headerTitle: { color: "#FFF", fontSize: 20, fontWeight: "800" },
  deleteBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "#1A1A2E",
    alignItems: "center", justifyContent: "center",
  },
  deleteIcon: { fontSize: 18 },
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: "#1A1A2E",
    borderRadius: 50,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1, paddingVertical: 10,
    borderRadius: 50,
    alignItems: "center",
  },
  tabActive: { backgroundColor: "#2A2A4A" },
  tabText: { color: "rgba(255,255,255,0.4)", fontWeight: "700", fontSize: 13 },
  tabTextActive: { color: "#FFF" },
  list: { paddingHorizontal: 16, gap: 12, paddingBottom: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A2E",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  spinLabel: { color: "rgba(255,255,255,0.4)", fontSize: 13, width: 50 },
  trophy: { fontSize: 22, width: 36, textAlign: "center" },
  badge: {
    paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 50,
    minWidth: 80,
    alignItems: "center",
  },
  badgeText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  timeText: { color: "rgba(255,255,255,0.5)", fontSize: 13, flex: 1, textAlign: "right" },
  empty: { color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 60, fontSize: 16 },
});