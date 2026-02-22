// game/constants.ts
import { Dimensions } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export { SCREEN_W, SCREEN_H };

// Layout proportions
export const RIVER_HEIGHT = SCREEN_H * 0.58;
export const RIVER_WIDTH = SCREEN_W * 0.62;
export const BANK_WIDTH = (SCREEN_W - RIVER_WIDTH) / 2;

// Colors — Wonka palette
export const COLORS = {
  chocolate:    '#5C3317',
  chocolateMid: '#7B4A2A',
  chocolateLight: '#A0622A',
  gold:         '#FFD700',
  goldDark:     '#C8A800',
  purple:       '#6B2D8B',
  purpleLight:  '#8B44B0',
  candyRed:     '#E8002D',
  candyWhite:   '#FFFFFF',
  green:        '#2ECC40',
  orange:       '#FF6B00',
  background:   '#1A0A00',
  textLight:    '#FFF8E1',
  textGold:     '#FFD700',
  badFlash:     'rgba(232, 0, 45, 0.55)',
};

// Game thresholds
export const GOLDEN_TICKET_THRESHOLD = 0.80; // 80% good reps

// Boat animation durations (ms)
export const ANIM = {
  WOBBLE_DURATION:    600,
  SLAM_DURATION:      300,
  RECENTER_DURATION:  500,
  FLASH_DURATION:     250,
};

// Durability
export const DURABILITY_PER_BAD_REP = 15; // points lost per BAD rep (out of 100)
