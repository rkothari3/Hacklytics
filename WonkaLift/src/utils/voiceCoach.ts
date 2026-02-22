import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
import type { FormClass } from '../types';

const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_KEY ?? '';
const VOICE_ID = 'pNInz6obpgDQGcFmaJgB';

const FORM_PHRASES: Record<FormClass, string[]> = {
  GOOD: ['Perfect form!', 'Great rep!', 'Keep it up!', 'Beautiful!'],
  BAD: ['Bad form, reset!', 'Slow down!', 'Watch your technique!'],
};

const TEMPO_WARNING_PHRASES = [
  'Control the tempo.',
  'Watch your speed.',
  'Steady rhythm.',
];

function pickPhrase(formClass: FormClass, tempoWarning: boolean): string {
  if (tempoWarning) {
    return TEMPO_WARNING_PHRASES[Math.floor(Math.random() * TEMPO_WARNING_PHRASES.length)];
  }
  const pool = FORM_PHRASES[formClass];
  return pool[Math.floor(Math.random() * pool.length)];
}

let lastSpoke = 0;
const MIN_GAP_MS = 2500;

export async function speakCoaching(formClass: FormClass, tempoWarning = false): Promise<void> {
  const now = Date.now();
  if (now - lastSpoke < MIN_GAP_MS) return;
  lastSpoke = now;

  const text = pickPhrase(formClass, tempoWarning);

  if (ELEVENLABS_API_KEY) {
    try {
      await speakElevenLabs(text);
      return;
    } catch {
      // fall through to device TTS
    }
  }

  Speech.speak(text, { rate: 1.05, pitch: 1.0 });
}

async function speakElevenLabs(text: string): Promise<void> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.75, similarity_boost: 0.75 },
      }),
    },
  );

  if (!res.ok) throw new Error(`ElevenLabs ${res.status}`);

  const arrayBuffer = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const tempPath = `${FileSystem.cacheDirectory}voice_${Date.now()}.mp3`;
  await FileSystem.writeAsStringAsync(tempPath, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const { sound } = await Audio.Sound.createAsync({ uri: tempPath });
  await sound.playAsync();
  sound.setOnPlaybackStatusUpdate((status) => {
    if (status.isLoaded && status.didJustFinish) {
      sound.unloadAsync();
    }
  });
}
