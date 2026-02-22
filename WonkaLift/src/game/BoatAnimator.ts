import { useRef, useEffect } from 'react';
import { Animated, Easing, Platform } from 'react-native';
import type { BoatReaction } from '../types';
import { ANIM, RIVER_WIDTH } from '../constants/wonka';

const USE_NATIVE = Platform.OS !== 'web';

const WOBBLE_AMOUNT = RIVER_WIDTH * 0.12;
const SLAM_AMOUNT = RIVER_WIDTH * 0.38;

interface BoatAnimValues {
  boatX: Animated.Value;
  flashOpacity: Animated.Value;
  boatRotation: Animated.Value;
}

export function useBoatAnimator(reaction: BoatReaction | null): BoatAnimValues {
  const boatX = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const boatRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!reaction) return;

    boatX.stopAnimation();
    flashOpacity.stopAnimation();
    boatRotation.stopAnimation();

    if (reaction === 'steady') {
      Animated.spring(boatX, {
        toValue: 0,
        friction: 5,
        tension: 80,
        useNativeDriver: USE_NATIVE,
      }).start();
      Animated.spring(boatRotation, {
        toValue: 0,
        friction: 5,
        tension: 80,
        useNativeDriver: USE_NATIVE,
      }).start();
    }

    if (reaction === 'wobble') {
      Animated.sequence([
        Animated.timing(boatX, {
          toValue: WOBBLE_AMOUNT,
          duration: ANIM.WOBBLE_DURATION / 4,
          easing: Easing.out(Easing.sin),
          useNativeDriver: USE_NATIVE,
        }),
        Animated.timing(boatX, {
          toValue: -WOBBLE_AMOUNT,
          duration: ANIM.WOBBLE_DURATION / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE,
        }),
        Animated.spring(boatX, {
          toValue: 0,
          friction: 4,
          tension: 60,
          useNativeDriver: USE_NATIVE,
        }),
      ]).start();
    }

    if (reaction === 'slam') {
      const dir = Math.random() < 0.5 ? 1 : -1;

      Animated.sequence([
        Animated.parallel([
          Animated.timing(boatX, {
            toValue: dir * SLAM_AMOUNT,
            duration: ANIM.SLAM_DURATION,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: USE_NATIVE,
          }),
          Animated.timing(boatRotation, {
            toValue: dir,
            duration: ANIM.SLAM_DURATION,
            useNativeDriver: USE_NATIVE,
          }),
          Animated.sequence([
            Animated.timing(flashOpacity, {
              toValue: 1,
              duration: ANIM.FLASH_DURATION,
              useNativeDriver: USE_NATIVE,
            }),
            Animated.timing(flashOpacity, {
              toValue: 0,
              duration: ANIM.FLASH_DURATION,
              useNativeDriver: USE_NATIVE,
            }),
          ]),
        ]),
        Animated.parallel([
          Animated.spring(boatX, {
            toValue: 0,
            friction: 4,
            tension: 50,
            useNativeDriver: USE_NATIVE,
          }),
          Animated.spring(boatRotation, {
            toValue: 0,
            friction: 4,
            tension: 50,
            useNativeDriver: USE_NATIVE,
          }),
        ]),
      ]).start();
    }
  }, [reaction, boatX, flashOpacity, boatRotation]);

  return { boatX, flashOpacity, boatRotation };
}
