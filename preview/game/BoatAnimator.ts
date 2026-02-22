// game/BoatAnimator.ts
import { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';
import { RepResult } from './types';
import { ANIM, RIVER_WIDTH } from './constants';

const WOBBLE_AMOUNT = RIVER_WIDTH * 0.12;   // side-to-side pixels for SLOPPY
const SLAM_AMOUNT   = RIVER_WIDTH * 0.38;   // pixels to wall for BAD

export function useBoatAnimator(lastRep: RepResult | null) {
  const boatX        = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const boatRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!lastRep) return;

    if (lastRep.formClass === 'GOOD') {
      // Smooth re-center
      Animated.spring(boatX, {
        toValue: 0,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }).start();
      Animated.spring(boatRotation, {
        toValue: 0,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }).start();
    }

    if (lastRep.formClass === 'SLOPPY') {
      // Wobble left-right
      Animated.sequence([
        Animated.timing(boatX, {
          toValue: WOBBLE_AMOUNT,
          duration: ANIM.WOBBLE_DURATION / 4,
          easing: Easing.out(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(boatX, {
          toValue: -WOBBLE_AMOUNT,
          duration: ANIM.WOBBLE_DURATION / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.spring(boatX, {
          toValue: 0,
          friction: 4,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    }

    if (lastRep.formClass === 'BAD') {
      const slamDirection = Math.random() < 0.5 ? 1 : -1;


      // Slam + tilt + flash + re-center
      Animated.sequence([
        Animated.parallel([
          Animated.timing(boatX, {
            toValue: slamDirection * SLAM_AMOUNT,
            duration: ANIM.SLAM_DURATION,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(boatRotation, {
            toValue: slamDirection,
            duration: ANIM.SLAM_DURATION,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(flashOpacity, {
              toValue: 1,
              duration: ANIM.FLASH_DURATION,
              useNativeDriver: true,
            }),
            Animated.timing(flashOpacity, {
              toValue: 0,
              duration: ANIM.FLASH_DURATION,
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.parallel([
          Animated.spring(boatX, {
            toValue: 0,
            friction: 4,
            tension: 50,
            useNativeDriver: true,
          }),
          Animated.spring(boatRotation, {
            toValue: 0,
            friction: 4,
            tension: 50,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [lastRep]);

  return { boatX, flashOpacity, boatRotation };
}
