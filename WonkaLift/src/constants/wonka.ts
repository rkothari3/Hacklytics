import { Dimensions, Platform } from 'react-native';

const dims = Dimensions.get('window');
const MAX_MOBILE_W = 430;
export const SCREEN_W = Platform.OS === 'web' ? Math.min(dims.width, MAX_MOBILE_W) : dims.width;
export const SCREEN_H = dims.height;

export const RIVER_HEIGHT = SCREEN_H * 0.50;
export const RIVER_WIDTH = SCREEN_W * 0.62;
export const BANK_WIDTH = (SCREEN_W - RIVER_WIDTH) / 2;

export const WONKA = {
  chocolate: '#5C3317',
  chocolateMid: '#7B4A2A',
  chocolateLight: '#A0622A',
  gold: '#FFD700',
  goldDark: '#C8A800',
  purple: '#6B2D8B',
  purpleLight: '#8B44B0',
  candyRed: '#E8002D',
  candyWhite: '#FFFFFF',
  green: '#2ECC40',
  orange: '#FF6B00',
  bg: '#1A0A00',
  textLight: '#FFF8E1',
  textGold: '#FFD700',
  badFlash: 'rgba(232, 0, 45, 0.55)',
};

export const GOLDEN_TICKET_THRESHOLD = 0.80;

export const ANIM = {
  WOBBLE_DURATION: 600,
  SLAM_DURATION: 300,
  RECENTER_DURATION: 500,
  FLASH_DURATION: 250,
};

export const DURABILITY_PER_BAD_REP = 15;
