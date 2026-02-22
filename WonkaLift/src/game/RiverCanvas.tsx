import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing, Image, Platform } from 'react-native';
import { WONKA, SCREEN_W, RIVER_HEIGHT, RIVER_WIDTH, BANK_WIDTH } from '../constants/wonka';
import type { BoatReaction } from '../types';
import { useBoatAnimator } from './BoatAnimator';
import { IMG } from './images';

const USE_NATIVE = Platform.OS !== 'web';

type Props = { boatReaction: BoatReaction | null };

const LOLLIPOP_POSITIONS = [0.05, 0.25, 0.5, 0.75, 0.95];

const CandyCaneWall = React.memo(function CandyCaneWall({ side }: { side: 'left' | 'right' }) {
  return (
    <View style={[styles.wall, side === 'left' ? styles.wallLeft : styles.wallRight]}>
      <Image source={IMG.candyCane} style={styles.candyCaneImg} resizeMode="stretch" />
      {LOLLIPOP_POSITIONS.map((pct, i) => (
        <View
          key={`lp-${side}-${i}`}
          style={[styles.lollipop, { top: RIVER_HEIGHT * pct }]}
        >
          <Image source={IMG.lollipop} style={styles.lollipopImg} />
        </View>
      ))}
    </View>
  );
});

const OompaBank = React.memo(function OompaBank({ side }: { side: 'left' | 'right' }) {
  return (
    <View style={side === 'left' ? styles.oompaLeft : styles.oompaRight}>
      <Image source={IMG.oompa} style={styles.oompaImg} />
      <Image source={IMG.oompa} style={styles.oompaImg} />
      <Image source={IMG.oompa} style={styles.oompaImg} />
    </View>
  );
});

function ScrollingRiver() {
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(scrollY, {
        toValue: RIVER_HEIGHT,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: USE_NATIVE,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [scrollY]);

  return (
    <View style={styles.riverClip}>
      <Animated.View style={[styles.tileStrip, { transform: [{ translateY: scrollY }] }]}>
        <Image source={IMG.river} style={styles.riverTile} resizeMode="cover" />
        <Image source={IMG.river} style={styles.riverTile} resizeMode="cover" />
      </Animated.View>
    </View>
  );
}

function RiverCanvas({ boatReaction }: Props) {
  const { boatX, flashOpacity, boatRotation } = useBoatAnimator(boatReaction);

  return (
    <View style={styles.container}>
      <OompaBank side="left" />
      <CandyCaneWall side="left" />

      <View style={styles.riverContainer}>
        <ScrollingRiver />

        {/* Inner shadow edges for depth */}
        <View style={styles.shadowLeft} pointerEvents="none" />
        <View style={styles.shadowRight} pointerEvents="none" />

        <Animated.View pointerEvents="none" style={[styles.flashOverlay, { opacity: flashOpacity }]} />

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
          <Image source={IMG.boat} style={styles.boatImg} />
        </Animated.View>
      </View>

      <CandyCaneWall side="right" />
      <OompaBank side="right" />
    </View>
  );
}

export default React.memo(RiverCanvas);

const WALL_W = BANK_WIDTH * 0.65;

const styles = StyleSheet.create({
  container: {
    width: SCREEN_W,
    height: RIVER_HEIGHT,
    flexDirection: 'row',
    backgroundColor: WONKA.chocolate,
    overflow: 'hidden',
  },
  oompaLeft: {
    width: BANK_WIDTH * 0.35,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 20,
  },
  oompaRight: {
    width: BANK_WIDTH * 0.35,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 20,
  },
  wall: { overflow: 'hidden', height: RIVER_HEIGHT, position: 'relative' },
  wallLeft: { width: WALL_W },
  wallRight: { width: WALL_W },
  lollipop: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
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
  },
  tileStrip: {
    marginTop: -RIVER_HEIGHT,
  },
  riverTile: {
    width: RIVER_WIDTH,
    height: RIVER_HEIGHT,
  },
  shadowLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 12,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  shadowRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 12,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: WONKA.badFlash,
  },
  boat: {
    position: 'absolute',
    bottom: RIVER_HEIGHT * 0.25,
    left: RIVER_WIDTH / 2 - 36,
    zIndex: 10,
  },
  lollipopImg: { width: 34, height: 44, resizeMode: 'contain' },
  boatImg: { width: 80, height: 110, resizeMode: 'contain' },
  oompaImg: { width: 44, height: 56, resizeMode: 'contain' },
  candyCaneImg: { width: WALL_W, height: RIVER_HEIGHT },
});
