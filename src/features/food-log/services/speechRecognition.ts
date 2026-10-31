import { requireOptionalNativeModule } from 'expo';
import type { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

type SpeechRecognitionModule = typeof ExpoSpeechRecognitionModule;

/**
 * The native speech module, or null when this build does not include it (an older dev client).
 * The package itself throws on import without it, so it is looked up here instead.
 */
const speechModule = requireOptionalNativeModule<SpeechRecognitionModule>('ExpoSpeechRecognition');

/** The speech module when this device can recognize speech, otherwise null. */
export function getSpeechRecognition(): SpeechRecognitionModule | null {
  try {
    return speechModule?.isRecognitionAvailable() ? speechModule : null;
  } catch {
    return null;
  }
}
