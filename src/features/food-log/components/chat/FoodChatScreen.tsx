import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { IconButton, ScreenHeader, Text } from '@/common/components';
import { getDevFakeBarcode } from '@/features/dev-tools';
import { useOpenCamera, useOpenImageLibrary, useOpenQrScanner } from '@/providers/camera';
import { toast } from '@/utils/toast';
import { useFoodChat, type ChatMessage } from '../../hooks/useFoodChat';
import { useRecentFoods } from '../../hooks/useRecentFoods';
import type { RecentFood } from '../../types';
import { matchesFoodSearch } from '../../utils/foodSearch';
import { ChatComposer } from '../ChatComposer';
import { ChatMessageItem } from './ChatMessageItem';
import { RecentFoodsBar } from './RecentFoodsBar';

export function FoodChatScreen() {
  const { t } = useTranslation();
  const { theme, rt } = useUnistyles();
  const router = useRouter();
  const params = useLocalSearchParams<{ imageUri?: string; message?: string }>();
  const chat = useFoodChat();
  const openCamera = useOpenCamera();
  const openImageLibrary = useOpenImageLibrary();
  const openBarcodeScanner = useOpenQrScanner();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [draft, setDraft] = useState(params.message ?? '');
  const recentFoods = useRecentFoods(draft);
  const [imageUri, setImageUri] = useState<string | null>(params.imageUri ?? null);
  const lastMessage = chat.messages[chat.messages.length - 1];

  useEffect(() => {
    const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [chat.messages.length, chat.isSending]);

  const handleSend = (text = draft) => {
    const pendingImage = imageUri;
    setDraft('');
    setImageUri(null);
    void chat.sendMessage(text, pendingImage);
  };

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

  const handleRecent = async (food: RecentFood) => {
    try {
      await chat.logRecent(food);
      toast.success(t('chat.loggedToast'));
      // The text was only a search for this food; a longer message keeps its other foods.
      if (matchesFoodSearch(food.name, draft)) {
        setDraft('');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errors.generic'));
    }
  };

  const handleLog = async (messageId: string, itemIndex?: number) => {
    try {
      const logged = await chat.logMessageItems(messageId, itemIndex);
      if (logged) {
        toast.success(t('chat.loggedToast'));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errors.generic'));
    }
  };

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
          renderItem={({ item }) => (
            <ChatMessageItem
              message={item}
              savingKey={chat.savingKey}
              showFollowUps={item.id === lastMessage?.id && !chat.isSending}
              onLog={(messageId, itemIndex) => {
                void handleLog(messageId, itemIndex);
              }}
              onFollowUp={(text) => handleSend(text)}
            />
          )}
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
            onSubmit={() => handleSend()}
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
