import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, View, type ListRenderItemInfo } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { IconButton, ScreenHeader, Text } from '@/common/components';
import { getDevFakeBarcode } from '@/features/dev-tools';
import { useOpenCamera, useOpenImageLibrary, useOpenQrScanner } from '@/providers/camera';
import { toast } from '@/utils/toast';
import { useFoodChat, type ChatMessage } from '../../hooks/useFoodChat';
import { useRecentFoods } from '../../hooks/useRecentFoods';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import type { RecentFood } from '../../types';
import { matchesFoodSearch } from '../../utils/foodSearch';
import { ChatComposer } from '../ChatComposer';
import { ChatMessageItem } from './ChatMessageItem';
import { RecentFoodsBar } from './RecentFoodsBar';

export function FoodChatScreen() {
  const { t } = useTranslation();
  const { theme, rt } = useUnistyles();
  const router = useRouter();
  const params = useLocalSearchParams<{ imageUri?: string; message?: string; voice?: string }>();
  const chat = useFoodChat();
  const openCamera = useOpenCamera();
  const openImageLibrary = useOpenImageLibrary();
  const openBarcodeScanner = useOpenQrScanner();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [draft, setDraft] = useState(params.message ?? '');
  const recentFoods = useRecentFoods(draft);
  const [imageUri, setImageUri] = useState<string | null>(params.imageUri ?? null);
  const lastMessage = chat.messages[chat.messages.length - 1];
  // Dictated text goes after whatever was typed before the mic was tapped.
  const draftBeforeVoiceRef = useRef('');
  const voice = useVoiceInput(
    useCallback((transcript: string) => {
      const before = draftBeforeVoiceRef.current;
      setDraft(before ? `${before} ${transcript}` : transcript);
    }, [])
  );
  const startVoice = voice.start;
  const cancelVoice = voice.cancel;
  const { sendMessage, logMessageItems, undoLog } = chat;
  const voiceRequestedRef = useRef(params.voice === '1');

  useEffect(() => {
    const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [chat.messages.length, chat.isSending]);

  // Home's mic opens the chat already listening.
  useEffect(() => {
    if (voiceRequestedRef.current) {
      voiceRequestedRef.current = false;
      draftBeforeVoiceRef.current = '';
      void startVoice();
    }
  }, [startVoice]);

  const toggleVoice = () => {
    if (voice.isListening) {
      voice.stop();
      return;
    }

    draftBeforeVoiceRef.current = draft.trim();
    void voice.start();
  };

  // Stable while typing, so the chat history does not re-render on each keystroke.
  const sendText = useCallback(
    (text: string) => {
      cancelVoice();
      setDraft('');
      setImageUri(null);
      void sendMessage(text, imageUri);
    },
    [cancelVoice, imageUri, sendMessage]
  );

  const handleCamera = async () => {
    const photo = await openCamera();
    if (photo) {
      setImageUri(photo.uri);
    }
  };

  const handleLibrary = async () => {
    const photo = await openImageLibrary();
    if (photo) {
      setImageUri(photo.uri);
    }
  };

  const handleBarcode = async () => {
    const barcode = getDevFakeBarcode() ?? (await openBarcodeScanner());
    if (barcode) {
      void chat.addBarcodeProduct(barcode);
    }
  };

  /** Runs a diary change and toasts the outcome; `false` means nothing changed. */
  const withToast = useCallback(
    async (run: () => Promise<boolean>, successKey: 'chat.loggedToast' | 'chat.undoToast') => {
      try {
        if (await run()) {
          toast.success(t(successKey));
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t('errors.generic'));
      }
    },
    [t]
  );

  const handleRecent = (food: RecentFood) =>
    withToast(async () => {
      await chat.logRecent(food);
      // The text was only a search for this food; a longer message keeps its other foods.
      if (matchesFoodSearch(food.name, draft)) {
        setDraft('');
      }
      return true;
    }, 'chat.loggedToast');

  const handleLog = useCallback(
    (messageId: string, itemIndex?: number) => {
      void withToast(() => logMessageItems(messageId, itemIndex), 'chat.loggedToast');
    },
    [logMessageItems, withToast]
  );

  const handleUndo = useCallback(
    (messageId: string, itemIndex?: number) => {
      void withToast(() => undoLog(messageId, itemIndex), 'chat.undoToast');
    },
    [undoLog, withToast]
  );

  const lastMessageId = lastMessage?.id;
  const renderMessage = useCallback(
    ({ item }: ListRenderItemInfo<ChatMessage>) => (
      <ChatMessageItem
        message={item}
        savingKey={chat.savingKey}
        showFollowUps={item.id === lastMessageId && !chat.isSending}
        onLog={handleLog}
        onUndo={handleUndo}
        onFollowUp={sendText}
      />
    ),
    [chat.isSending, chat.savingKey, handleLog, handleUndo, lastMessageId, sendText]
  );

  return (
    <View style={styles.container}>
      <View style={styles.sheetTop}>
        <ScreenHeader
          title={t('chat.title')}
          subtitle={t('chat.subtitle')}
          showBack={false}
          safeTop={false}
          right={
            <IconButton
              icon="close"
              variant="ghost"
              onPress={() => router.back()}
              accessibilityLabel={t('common.close')}
            />
          }
        />
      </View>
      {/* Negative offset lets the composer's home-indicator padding slide under the keyboard. */}
      <KeyboardAvoidingView
        behavior="padding"
        automaticOffset
        keyboardVerticalOffset={-rt.insets.bottom}
        style={styles.flex}
      >
        <FlatList
          ref={listRef}
          data={chat.messages}
          keyExtractor={(message) => message.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={renderMessage}
          ListFooterComponent={
            chat.isSending ? (
              <View style={styles.typing}>
                <ActivityIndicator size="small" color={theme.colors.brand.primary} />
                <Text variant="bodySmall" color="secondary">
                  {t('chat.thinking')}
                </Text>
              </View>
            ) : undefined
          }
        />
        <View style={styles.composer}>
          <RecentFoodsBar
            foods={recentFoods}
            onSelect={(food) => {
              void handleRecent(food);
            }}
            disabled={chat.isSending}
          />
          <ChatComposer
            value={draft}
            onChangeText={setDraft}
            onSubmit={() => sendText(draft)}
            onCameraPress={() => {
              void handleCamera();
            }}
            onLibraryPress={() => {
              void handleLibrary();
            }}
            onBarcodePress={() => {
              void handleBarcode();
            }}
            imageUri={imageUri}
            onRemoveImage={() => setImageUri(null)}
            onMicPress={voice.isAvailable ? toggleVoice : undefined}
            listening={voice.isListening}
            disabled={chat.isSending}
            autoFocus={!params.imageUri}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  container: {
    flex: 1,
  },
  sheetTop: {
    // Leaves room for the native sheet grabber above the header.
    paddingTop: theme.metrics.spacingV.p20,
  },
  flex: {
    flex: 1,
  },
  list: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingVertical: theme.metrics.spacingV.p12,
    gap: theme.metrics.spacingV.p16,
  },
  typing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
    paddingLeft: theme.metrics.spacing.p40,
    paddingTop: theme.metrics.spacingV.p8,
  },
  composer: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p8,
    paddingBottom: rt.insets.bottom + theme.metrics.spacingV.p8,
    gap: theme.metrics.spacingV.p8,
  },
}));
