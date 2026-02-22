import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Text, Platform } from 'react-native';
import { WONKA, DURABILITY_PER_BAD_REP } from '../constants/wonka';

const USE_NATIVE = Platform.OS !== 'web';

type Props = { badCount: number };

function DurabilityBar({ badCount }: Props) {
  const durability = Math.max(0, 100 - badCount * DURABILITY_PER_BAD_REP);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(scaleAnim, {
      toValue: durability / 100,
      duration: 300,
      useNativeDriver: USE_NATIVE,
    }).start();
  }, [durability, scaleAnim]);

  const barColor = durability > 60 ? WONKA.green : durability > 30 ? WONKA.gold : WONKA.candyRed;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>BOAT DURABILITY</Text>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { backgroundColor: barColor, transform: [{ scaleX: scaleAnim }] }]} />
      </View>
    </View>
  );
}

export default React.memo(DurabilityBar);

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingVertical: 4, backgroundColor: WONKA.bg },
  label: { color: WONKA.textGold, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 3 },
  track: { height: 8, backgroundColor: '#3A1A00', borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, transformOrigin: 'left' },
});
