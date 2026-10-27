import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { ScreenHeader, Text } from '@/common/components';
import { toast } from '@/utils/toast';
import { useAttachFoodPhoto } from '../../hooks/useAttachFoodPhoto';
import { useFoodChat, type ChatMessage } from '../../hooks/useFoodChat';
import { ChatComposer } from '../ChatComposer';
import { ChatMessageItem } from './ChatMessageItem';

export function FoodChatScreen() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const params = useLocalSearchParams<{ imageUri?: string; message?: string }>();
  const chat = useFoodChat();
  const attachPhoto = useAttachFoodPhoto();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [draft, setDraft] = useState(params.message ?? '');
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

  const handleAttach = async () => {
    const uri = await attachPhoto();
    if (uri) {
      setImageUri(uri);
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
      <ScreenHeader title={t('chat.title')} subtitle={t('chat.subtitle')} />
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
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
          <ChatComposer
            value={draft}
            onChangeText={setDraft}
            onSubmit={() => handleSend()}
            onAttachPress={() => {
              void handleAttach();
            }}
            imageUri={imageUri}
            onRemoveImage={() => setImageUri(null)}
            disabled={chat.isSending}
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
  },
}));
