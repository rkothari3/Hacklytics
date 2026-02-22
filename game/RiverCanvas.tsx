// game/RiverCanvas.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  Easing,
  Image,
} from 'react-native';
import { COLORS, SCREEN_W, RIVER_HEIGHT, RIVER_WIDTH, BANK_WIDTH } from './constants';
import { RepResult } from './types';
import { useBoatAnimator } from './BoatAnimator';

type Props = {
  lastRep: RepResult | null;
};

// Candy cane stripe — alternating red/white vertical bars
const CandyCaneWall = React.memo(function CandyCaneWall({ side }: { side: 'left' | 'right' }) {
  return (
    <View style={[styles.wall, side === 'left' ? styles.wallLeft : styles.wallRight]}>
      <Image
        source={require('./assets/candy_cane_wall.png')}
        style={styles.candyCaneImg}
        resizeMode="cover"
      />
      {[0, 4, 8, 12].map(i => (
        <View key={`lollipop-${i}`} style={[styles.lollipop, { top: (RIVER_HEIGHT / 16) * i + 20 }]}>
          <Image source={require('./assets/lollipop.png')} style={styles.lollipopImg} />
        </View>
      ))}
    </View>
  );
});

// Static Oompa Loompa decoration — two figures, no changing props
const OompaBank = React.memo(function OompaBank({ side }: { side: 'left' | 'right' }) {
  return (
    <View style={side === 'left' ? styles.oompaLeft : styles.oompaRight}>
      <Image source={require('./assets/oompa_loompa.png')} style={styles.oompaImg} />
      <Image source={require('./assets/oompa_loompa.png')} style={styles.oompaImg} />
    </View>
  );
});

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

const RiverTile = React.memo(function RiverTile({ offset = false }: { offset?: boolean }) {
  return (
    <Image
      source={require('./assets/chocolate_river_tile.png')}
      style={[styles.riverTile, offset && { marginTop: -RIVER_HEIGHT }]}
      resizeMode="cover"
    />
  );
});

function RiverCanvas({ lastRep }: Props) {
  const { boatX, flashOpacity, boatRotation } = useBoatAnimator(lastRep);

  return (
    <View style={styles.container}>
      {/* Oompa Loompas on left bank */}
      <OompaBank side="left" />

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
          <Image source={require('./assets/wonka_boat.png')} style={styles.boatImg} />
        </Animated.View>
      </View>

      {/* Right bank */}
      <CandyCaneWall side="right" />

      {/* Oompa Loompas on right bank */}
      <OompaBank side="right" />
    </View>
  );
}

export default React.memo(RiverCanvas);

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
  lollipop: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
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
  lollipopImg: {
    width: 28,
    height: 36,
    resizeMode: 'contain',
  },
  boatImg: {
    width: 60,
    height: 84,
    resizeMode: 'contain',
  },
  oompaImg: {
    width: 36,
    height: 48,
    resizeMode: 'contain',
  },
  candyCaneImg: {
    width: BANK_WIDTH * 0.65,
    height: RIVER_HEIGHT,
  },
});
