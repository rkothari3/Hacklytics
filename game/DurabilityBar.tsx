// game/DurabilityBar.tsx
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Text } from 'react-native';
import { COLORS, SCREEN_W, DURABILITY_PER_BAD_REP } from './constants';

type Props = {
  badCount: number;
};

export default function DurabilityBar({ badCount }: Props) {
  const durability = Math.max(0, 100 - badCount * DURABILITY_PER_BAD_REP);
  const widthAnim = useRef(new Animated.Value(SCREEN_W - 32)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: ((SCREEN_W - 32) * durability) / 100,
      duration: 300,
      useNativeDriver: false, // width animation requires JS driver
    }).start();
  }, [durability]);

  const barColor =
    durability > 60 ? COLORS.green :
    durability > 30 ? COLORS.gold :
    COLORS.candyRed;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>BOAT DURABILITY</Text>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: widthAnim, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: COLORS.background,
  },
  label: {
    color: COLORS.textGold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 3,
  },
  track: {
    height: 8,
    backgroundColor: '#3A1A00',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
