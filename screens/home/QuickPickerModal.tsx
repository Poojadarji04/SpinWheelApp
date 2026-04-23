import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  StyleSheet,
} from 'react-native';


export default function QuickPickerModal({ visible, onClose, onConfirm }) {
  const [title, setTitle] = useState('');
  const [slicesText, setSlicesText] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(80)).current;

  // Animate in / out
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(80);
    }
  }, [visible]);

  // ── Handlers ─────────────────────────────────────────────────
  const handleConfirm = () => {
    const trimmedTitle = title.trim();
    const segments = slicesText
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (!trimmedTitle) {
      Alert.alert('Missing Title', 'Please enter a title for your wheel.');
      return;
    }
    if (segments.length < 2) {
      Alert.alert(
        'Not Enough Slices',
        'Enter at least 2 slices separated by commas.\nExample: Slice 1, Slice 2, Slice 3'
      );
      return;
    }

    onConfirm({ title: trimmedTitle, segments });
    resetFields();
  };

  const handleClose = () => {
    resetFields();
    onClose();
  };

  const resetFields = () => {
    setTitle('');
    setSlicesText('');
  };


  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Dimmed backdrop — tap to close */}
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleClose} />
        </Animated.View>

        {/* Bottom sheet */}
        <Animated.View
          style={[
            styles.sheet,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Drag handle */}
          <View style={styles.handle} />

          {/* Heading */}
          <Text style={styles.title}>Quick Picker</Text>
          <Text style={styles.subtitle}>
            Give your wheel a name, then list the slices separated by commas.
          </Text>
          <Text style={styles.example}>Example:  Slice 1, Slice 2, Slice 3</Text>

          {/* Wheel title input */}
          <Text style={styles.label}>WHEEL TITLE</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. What to eat?"
            placeholderTextColor="#444"
            value={title}
            onChangeText={setTitle}
            returnKeyType="next"
            maxLength={50}
          />

          {/* Slices input */}
          <Text style={styles.label}>SLICES (comma separated)</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder="Slice 1, Slice 2, Slice 3, ..."
            placeholderTextColor="#444"
            value={slicesText}
            onChangeText={setSlicesText}
            multiline
          />

          {/* Action buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.btnCancel} onPress={handleClose}>
              <Text style={styles.btnCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnCreate} onPress={handleConfirm}>
              <Text style={styles.btnCreateText}>＋  Create</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  // Dimmed backdrop
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.70)',
  },

  // Bottom sheet
  sheet: {
    backgroundColor: '#141420',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderWidth: 1,
    borderColor: '#252535',
    borderBottomWidth: 0,
  },

  // Drag handle
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333345',
    alignSelf: 'center',
    marginBottom: 22,
  },

  // Text
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 20,
    marginBottom: 4,
  },
  example: {
    fontSize: 12,
    color: '#7C3AED',
    fontStyle: 'italic',
    marginBottom: 22,
  },

  // Input label
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.9,
    marginBottom: 6,
  },

  // Inputs
  input: {
    backgroundColor: '#1C1C2C',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2A2A3E',
    marginBottom: 16,
  },
  inputMulti: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Buttons row
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: '#1C1C2C',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  btnCancelText: {
    color: 'rgba(255,255,255,0.50)',
    fontSize: 15,
    fontWeight: '600',
  },
  btnCreate: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  btnCreateText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});