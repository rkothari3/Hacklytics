// game/RiverCanvas.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  Easing,
  Text,
} from 'react-native';
import { COLORS, SCREEN_W, RIVER_HEIGHT, RIVER_WIDTH, BANK_WIDTH } from './constants';
import { RepResult } from './types';
import { useBoatAnimator } from './BoatAnimator';

type Props = {
  lastRep: RepResult | null;
};

// Candy cane stripe — alternating red/white vertical bars
function CandyCaneWall({ side }: { side: 'left' | 'right' }) {
  const stripes = Array.from({ length: 20 });
  return (
    <View style={[styles.wall, side === 'left' ? styles.wallLeft : styles.wallRight]}>
      {stripes.map((_, i) => (
        <View
          key={i}
          style={[
            styles.stripe,
            { backgroundColor: i % 2 === 0 ? COLORS.candyRed : COLORS.candyWhite, left: i * 10 },
          ]}
        />
      ))}
      {/* Lollipops every ~4 stripes */}
      {[0, 4, 8, 12].map(i => (
        <View key={`lollipop-${i}`} style={[styles.lollipop, { top: (RIVER_HEIGHT / 16) * i + 20 }]}>
          <Text style={styles.lollipopEmoji}>🍭</Text>
        </View>
      ))}
    </View>
  );
}

// Scrolling river tile — looped translateY
function ScrollingRiver() {
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(scrollY, {
        toValue: RIVER_HEIGHT,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Two tiles stacked so the seam is invisible
  return (
    <View style={styles.riverClip}>
      <Animated.View style={{ transform: [{ translateY: scrollY }] }}>
        <RiverTile />
        <RiverTile offset />
      </Animated.View>
    </View>
  );
}

function RiverTile({ offset = false }: { offset?: boolean }) {
  // Horizontal ripple lines to suggest flowing chocolate
  const lines = Array.from({ length: 12 });
  return (
    <View style={[styles.riverTile, offset && { marginTop: -RIVER_HEIGHT }]}>
      {lines.map((_, i) => (
        <View
          key={i}
          style={[
            styles.rippleLine,
            {
              top: (RIVER_HEIGHT / 12) * i + 10,
              opacity: 0.18 + (i % 3) * 0.06,
              width: RIVER_WIDTH * (0.6 + (i % 4) * 0.08),
              left: RIVER_WIDTH * (0.05 + (i % 3) * 0.05),
            },
          ]}
        />
      ))}
    </View>
  );
}

export default function RiverCanvas({ lastRep }: Props) {
  const { boatX, flashOpacity, boatRotation } = useBoatAnimator(lastRep);

  return (
    <View style={styles.container}>
      {/* Oompa Loompas on left bank */}
      <View style={styles.oompaLeft}>
        <Text style={styles.oompaEmoji}>🧍</Text>
        <Text style={styles.oompaEmoji}>🧍</Text>
      </View>

      {/* Left bank */}
      <CandyCaneWall side="left" />

      {/* River channel */}
      <View style={styles.riverContainer}>
        <ScrollingRiver />

        {/* BAD rep flash overlay */}
        <Animated.View
          pointerEvents="none"
          style={[styles.flashOverlay, { opacity: flashOpacity }]}
        />

        {/* Wonka boat */}
        <Animated.View
          style={[
            styles.boat,
            {
              transform: [
                { translateX: boatX },
                {
                  rotate: boatRotation.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: ['-12deg', '0deg', '12deg'],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.boatEmoji}>🚣</Text>
        </Animated.View>
      </View>

      {/* Right bank */}
      <CandyCaneWall side="right" />

      {/* Oompa Loompas on right bank */}
      <View style={styles.oompaRight}>
        <Text style={styles.oompaEmoji}>🧍</Text>
        <Text style={styles.oompaEmoji}>🧍</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_W,
    height: RIVER_HEIGHT,
    flexDirection: 'row',
    backgroundColor: COLORS.chocolate,
    overflow: 'hidden',
  },
  oompaLeft: {
    width: BANK_WIDTH * 0.35,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 40,
  },
  oompaRight: {
    width: BANK_WIDTH * 0.35,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 40,
  },
  wall: {
    overflow: 'hidden',
    height: RIVER_HEIGHT,
    position: 'relative',
  },
  wallLeft: {
    width: BANK_WIDTH * 0.65,
  },
  wallRight: {
    width: BANK_WIDTH * 0.65,
  },
  stripe: {
    height: RIVER_HEIGHT,
    width: 10,
    position: 'absolute',
  },
  lollipop: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  lollipopEmoji: {
    fontSize: 22,
  },
  riverContainer: {
    width: RIVER_WIDTH,
    height: RIVER_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  riverClip: {
    width: RIVER_WIDTH,
    height: RIVER_HEIGHT,
    overflow: 'hidden',
    backgroundColor: COLORS.chocolateMid,
  },
  riverTile: {
    width: RIVER_WIDTH,
    height: RIVER_HEIGHT,
    backgroundColor: COLORS.chocolateMid,
    position: 'relative',
  },
  rippleLine: {
    position: 'absolute',
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.chocolateLight,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.badFlash,
  },
  boat: {
    position: 'absolute',
    bottom: RIVER_HEIGHT * 0.28,
    left: RIVER_WIDTH / 2 - 22,
    zIndex: 10,
  },
  boatEmoji: {
    fontSize: 44,
  },
  oompaEmoji: {
    fontSize: 28,
  },
});
