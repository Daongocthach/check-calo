import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/utils/toast';
import { getSpeechRecognition } from '../services/speechRecognition';

/** Errors that only mean the user stopped or said nothing; no message for these. */
const SILENT_ERRORS = new Set(['aborted', 'no-speech', 'speech-timeout']);

/**
 * Dictation for the chat composer. `onTranscript` receives the text heard so far, replacing the
 * previous call's text, until listening ends on its own after a pause or through `stop`.
 * `isAvailable` is false on devices or builds without speech recognition.
 */
export function useVoiceInput(onTranscript: (transcript: string) => void) {
  const { t, i18n } = useTranslation();
  const speech = useMemo(() => getSpeechRecognition(), []);
  const [isListening, setIsListening] = useState(false);
  const onTranscriptRef = useRef(onTranscript);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    if (!speech) {
      return undefined;
    }

    const subscriptions = [
      speech.addListener('start', () => setIsListening(true)),
      speech.addListener('end', () => setIsListening(false)),
      speech.addListener('result', (event) => {
        const transcript = event.results[0]?.transcript.trim();
        if (transcript) {
          onTranscriptRef.current(transcript);
        }
      }),
      speech.addListener('error', (event) => {
        setIsListening(false);
        if (!SILENT_ERRORS.has(event.error)) {
          toast.error(
            event.error === 'not-allowed' ? t('voice.permissionDenied') : t('voice.failed')
          );
        }
      }),
    ];

    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
      speech.abort();
    };
  }, [speech, t]);

  const start = useCallback(async () => {
    if (!speech) {
      return;
    }

    const permission = await speech.requestPermissionsAsync();
    if (!permission.granted) {
      toast.error(t('voice.permissionDenied'));
      return;
    }

    speech.start({
      lang: i18n.language === 'en' ? 'en-US' : 'vi-VN',
      interimResults: true,
      continuous: false,
    });
  }, [i18n.language, speech, t]);

  /** Stops listening and keeps what was heard. */
  const stop = useCallback(() => {
    speech?.stop();
  }, [speech]);

  /** Stops listening without delivering any more text, e.g. when the message is sent. */
  const cancel = useCallback(() => {
    speech?.abort();
  }, [speech]);

  return { isAvailable: speech !== null, isListening, start, stop, cancel };
}
