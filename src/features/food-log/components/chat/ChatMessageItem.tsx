import { Image } from 'expo-image';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Icon, Text } from '@/common/components';
import { getSavingKey, resolveConsumedAt, type ChatMessage } from '../../hooks/useFoodChat';
import type { ChatFoodItem } from '../../services/foodAnalyzer';
import type { RecentFood } from '../../types';
import { formatTime } from '../../utils/format';
import type { MealPortion } from '../../utils/mealImpact';
import { FoodResultCard } from './FoodResultCard';
import { MealImpactCard } from './MealImpactCard';

export interface ChatMessageItemProps {
  message: ChatMessage;
  /** The `getSavingKey` of the card action being saved, if any. */
  savingKey: string | null;
  showFollowUps: boolean;
  onLog: (messageId: string, itemIndex?: number) => void;
  onLogPortion: (messageId: string, portion: MealPortion) => void;
  /** Saves a recent food in place of the card's meal. */
  onLogRecent: (food: RecentFood) => void;
  onUndo: (messageId: string, itemIndex?: number) => void;
  onEditItem: (messageId: string, itemIndex: number, item: ChatFoodItem) => void;
  onRemoveItem: (messageId: string, itemIndex: number) => void;
  onScaleItem: (messageId: string, itemIndex: number, factor: number) => void;
  onFollowUp: (text: string) => void;
}

/** Memoized: the chat re-renders while typing, but a message only changes when it is saved. */
export const ChatMessageItem = memo(
  ({
    message,
    savingKey,
    showFollowUps,
    onLog,
    onLogPortion,
    onLogRecent,
    onUndo,
    onEditItem,
    onRemoveItem,
    onScaleItem,
    onFollowUp,
  }: ChatMessageItemProps) => {
    const { i18n } = useTranslation();
    const time = formatTime(message.createdAt, i18n.language);

    if (message.role === 'user') {
      return (
        <View style={styles.userRow}>
          {message.imageUri ? (
            <Image source={{ uri: message.imageUri }} style={styles.userImage} contentFit="cover" />
          ) : null}
          {message.text ? (
            <View style={styles.userBubble}>
              <Text variant="body" color="inverse">
                {message.text}
              </Text>
              <Text variant="caption" color="inverse" align="right" style={styles.time}>
                {time}
              </Text>
            </View>
          ) : null}
        </View>
      );
    }

    const isLogged =
      message.items.length > 0 &&
      message.items.every((_, index) => message.loggedEntryIds[index] !== undefined);
    const isSaving = savingKey === getSavingKey(message.id);
    // Removing or editing shifts item indexes, so foods stay editable only until one is saved.
    const canEdit = Object.keys(message.loggedEntryIds).length === 0;
    const editProps = (toMessageIndex: (index: number) => number) =>
      canEdit
        ? {
            onEditItem: (index: number, item: ChatFoodItem) =>
              onEditItem(message.id, toMessageIndex(index), item),
            onRemoveItem: (index: number) => onRemoveItem(message.id, toMessageIndex(index)),
            onScaleItem: (index: number, factor: number) =>
              onScaleItem(message.id, toMessageIndex(index), factor),
          }
        : {};

    return (
      <View style={styles.assistantRow}>
        <View style={styles.avatar}>
          <Icon name="sparkles" variant="brand" size={16} />
        </View>
        <View style={styles.assistantContent}>
          <View style={[styles.assistantBubble, message.intent === 'error' && styles.errorBubble]}>
            <Text variant="body">{message.text}</Text>
            <Text variant="caption" color="tertiary" style={styles.time}>
              {time}
            </Text>
          </View>
          {message.intent === 'suggest'
            ? message.items.map((item, index) => (
                <FoodResultCard
                  // Index keys: editing or scaling a suggestion changes its name and calories.
                  key={index}
                  items={[item]}
                  imageUri={null}
                  isSuggestion
                  isLogged={message.loggedEntryIds[index] !== undefined}
                  scales={[message.itemScales?.[index] ?? 1]}
                  isSaving={savingKey === getSavingKey(message.id, index)}
                  onLog={() => onLog(message.id, index)}
                  onUndo={() => onUndo(message.id, index)}
                  {...editProps(() => index)}
                />
              ))
            : null}
          {message.intent !== 'suggest' && message.items.length > 0 ? (
            <FoodResultCard
              items={message.items}
              imageUri={message.imageUri}
              isSuggestion={false}
              isLogged={isLogged}
              loggedPortion={message.loggedPortion}
              impact={
                isLogged ? null : (
                  <MealImpactCard
                    items={message.items}
                    consumedAt={resolveConsumedAt(message.mealTime)}
                    disabled={isSaving}
                    onLogPortion={(portion) => onLogPortion(message.id, portion)}
                    onLogFood={onLogRecent}
                    onAsk={onFollowUp}
                  />
                )
              }
              scales={message.itemScales}
              isSaving={isSaving}
              onLog={() => onLog(message.id)}
              onUndo={() => onUndo(message.id)}
              {...editProps((index) => index)}
            />
          ) : null}
          {showFollowUps && message.followUps.length > 0 ? (
            <View style={styles.followUps}>
              {message.followUps.map((followUp) => (
                <Pressable
                  key={followUp}
                  onPress={() => onFollowUp(followUp)}
                  accessibilityRole="button"
                  style={styles.followUpChip}
                >
                  <Text variant="bodySmall" color="link">
                    {followUp}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create((theme) => ({
  userRow: {
    alignItems: 'flex-end',
    gap: theme.metrics.spacingV.p8,
    paddingLeft: theme.metrics.spacing.p48,
  },
  userImage: {
    width: theme.metrics.spacing.p120,
    height: theme.metrics.spacing.p120,
    borderRadius: theme.metrics.borderRadius.lg,
  },
  userBubble: {
    backgroundColor: theme.colors.brand.primary,
    borderRadius: theme.metrics.borderRadius.xl,
    borderBottomRightRadius: theme.metrics.borderRadius.sm,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingVertical: theme.metrics.spacingV.p12,
  },
  assistantRow: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p8,
    paddingRight: theme.metrics.spacing.p24,
  },
  avatar: {
    width: theme.metrics.spacing.p32,
    height: theme.metrics.spacing.p32,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.section,
  },
  assistantContent: {
    flex: 1,
    gap: theme.metrics.spacingV.p8,
    alignItems: 'flex-start',
  },
  assistantBubble: {
    backgroundColor: theme.colors.background.surface,
    borderRadius: theme.metrics.borderRadius.xl,
    borderTopLeftRadius: theme.metrics.borderRadius.sm,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingVertical: theme.metrics.spacingV.p12,
  },
  errorBubble: {
    backgroundColor: theme.colors.state.errorBg,
  },
  time: {
    marginTop: theme.metrics.spacingV.p4,
    opacity: 0.8,
  },
  followUps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.metrics.spacing.p8,
  },
  followUpChip: {
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p8,
    borderRadius: theme.metrics.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    backgroundColor: theme.colors.background.surface,
  },
}));
