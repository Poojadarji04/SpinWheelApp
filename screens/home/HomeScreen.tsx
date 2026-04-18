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
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import QuickPickerModal from './QuickPickerModal';
import { useFocusEffect } from '@react-navigation/native';

const STORAGE_KEY = 'SPIN_WHEELS_STORE_V3';

const THEME = {
  bg: '#001E3C',
  accent: '#40C4FF',
};

function timeAgo(ts) {
  if (!ts) return 'Never';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/* ---------------- Icons ---------------- */

function GearIcon({ color, size = 16 }) {
  const t = size;
  return (
    <View style={{ width: t, height: t, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: t,
          height: t,
          borderRadius: t / 2,
          borderWidth: t * 0.12,
          borderColor: color,
          position: 'absolute',
        }}
      />

      {[0, 45, 90, 135].map((deg) => (
        <View
          key={deg}
          style={{
            position: 'absolute',
            width: t * 0.22,
            height: t * 0.22,
            backgroundColor: color,
            transform: [{ rotate: `${deg}deg` }, { translateX: t * 0.38 }],
          }}
        />
      ))}

      <View
        style={{
          width: t * 0.3,
          height: t * 0.3,
          borderRadius: t * 0.15,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

function DotsIcon({ color }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 3 }}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
}

/* ---------------- Card ---------------- */

function WheelCard({ card, onDelete, navigation }) {
  const scale = useRef(new Animated.Value(1)).current;

  const bounce = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 70, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 70, useNativeDriver: true }),
    ]).start();
  };

  const handleMenu = () => {
    Alert.alert(card.title, 'Choose action', [
      { text: 'Delete Wheel', style: 'destructive', onPress: () => onDelete(card.id) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const iconBg = THEME.accent + '25';
  const iconBdr = THEME.accent + '60';

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => {
        bounce();
        navigation.navigate('SpinWheel', { wheel: card });
      }}
    >
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <View style={[styles.cardInner, { backgroundColor: THEME.bg }]}>
          <View style={styles.cardLeft}>
            <Text style={[styles.cardTitle, { color: THEME.accent }]}>
              {card.title}
            </Text>

            <Text style={styles.cardMeta}>Used: {timeAgo(card.lastUsed)}</Text>

            <Text style={styles.cardSlices} numberOfLines={1}>
              {card.segments.join('  ·  ')}
            </Text>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: iconBg, borderColor: iconBdr }]}
              >
                <GearIcon color={THEME.accent} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: iconBg, borderColor: iconBdr, marginLeft: 10 }]}
                onPress={handleMenu}
              >
                <DotsIcon color={THEME.accent} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

/* ---------------- Empty State ---------------- */

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>No Wheels Yet</Text>
      <Text style={styles.emptySub}>
        Tap + Create Wheel to add your first spin wheel.
      </Text>
    </View>
  );
}

/* ---------------- Home Screen ---------------- */

export default function SpinWheelHome({ navigation }) {
  const [wheels, setWheels] = useState([]);
  const [modal, setModal] = useState(false);
  const [ready, setReady] = useState(false);

  // Replace the first useEffect with:
useFocusEffect(
  useCallback(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setWheels(JSON.parse(raw));
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

        <TouchableOpacity style={styles.headerBtn}>
          <GearIcon color="#666" size={18} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
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
        <TouchableOpacity style={styles.fab} onPress={() => setModal(true)}>
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

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({

safe:{
flex:1,
backgroundColor:'#080810'
},

header:{
flexDirection:'row',
justifyContent:'space-between',
alignItems:'center',
paddingHorizontal:20,
paddingVertical:16
},

headerTitle:{
fontSize:26,
fontWeight:'800',
color:'#FFF'
},

headerBtn:{
width:42,
height:42,
borderRadius:21,
backgroundColor:'#18182A',
alignItems:'center',
justifyContent:'center'
},

list:{
paddingHorizontal:16,
paddingTop:6,
gap:14
},

card:{
borderRadius:20,
overflow:'hidden'
},

cardInner:{
flexDirection:'row',
alignItems:'center',
minHeight:128,
paddingLeft:20,
paddingRight:14,
paddingVertical:18
},

cardLeft:{
flex:1
},

cardTitle:{
fontSize:20,
fontWeight:'800',
marginBottom:6
},

cardMeta:{
fontSize:13,
color:'rgba(255,255,255,0.5)'
},

cardSlices:{
fontSize:11,
color:'rgba(255,255,255,0.22)',
marginTop:4
},

actions:{
flexDirection:'row',
marginTop:12
},

iconBtn:{
width:36,
height:36,
borderRadius:10,
borderWidth:1.5,
alignItems:'center',
justifyContent:'center'
},

fabWrap:{
position:'absolute',
bottom:28,
left:0,
right:0,
alignItems:'center'
},

fab:{
backgroundColor:'#7C3AED',
paddingHorizontal:40,
paddingVertical:16,
borderRadius:50
},

fabText:{
color:'#FFF',
fontSize:16,
fontWeight:'700'
},

empty:{
flex:1,
alignItems:'center',
justifyContent:'center'
},

emptyTitle:{
fontSize:22,
fontWeight:'800',
color:'#FFF',
marginBottom:10
},

emptySub:{
fontSize:14,
color:'rgba(255,255,255,0.35)',
textAlign:'center'
}

});