import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { applyDevChatScenario } from '@/features/dev-tools';
import { getUserProfile } from '@/features/profile/services/profileRepository';
import { createEntityId } from '@/utils/id';
import { NUTRIENTS } from '../constants';
import { lookupFoodByBarcode, type BarcodeFoodLookupResult } from '../services/barcodeFoodLookup';
import { getDailyNutritionSummary } from '../services/dailySummaryService';
import {
  analyzeFoodChatMessage,
  type ChatFoodItem,
  type ChatIntent,
  type ChatMealTime,
} from '../services/foodAnalyzer';
import { logFoodItems, logRecentFood } from '../services/foodLogService';
import { useFoodEntryRefreshStore } from '../stores/useFoodEntryRefreshStore';
import type { RecentFood } from '../types';
import { pickNutrients } from '../utils/nutrients';

export type ChatMessage =
  | {
      id: string;
      role: 'user';
      text: string;
      imageUri: string | null;
      createdAt: string;
    }
  | {
      id: string;
      role: 'assistant';
      text: string;
      intent: ChatIntent | 'welcome' | 'error';
      items: ChatFoodItem[];
      mealTime: ChatMealTime | null;
      imageUri: string | null;
      followUps: string[];
      /** Indexes of `items` already saved to the diary. */
      loggedItemIndexes: number[];
      createdAt: string;
    };

function isQuotaError(message: string) {
  return message.includes('Daily AI usage limit reached');
}

function isAuthError(message: string) {
  return message.includes('Authentication required') || message.includes('Unauthorized');
}

/** Typical clock time for a meal mentioned in chat; only used when it is not in the future. */
const MEAL_TIME_HOURS: Record<Exclude<ChatMealTime, 'snack'>, [number, number]> = {
  breakfast: [7, 30],
  lunch: [12, 0],
  dinner: [19, 0],
};

function resolveConsumedAt(mealTime: ChatMealTime | null) {
  const now = new Date();

  if (!mealTime || mealTime === 'snack') {
    return now.toISOString();
  }

  const [hours, minutes] = MEAL_TIME_HOURS[mealTime];
  const mealDate = new Date(now);
  mealDate.setHours(hours, minutes, 0, 0);

  return (mealDate < now ? mealDate : now).toISOString();
}

function toNumberOr(value: string, fallback: number) {
  const parsed = Number(value);
  return value.trim() && Number.isFinite(parsed) ? parsed : fallback;
}

function barcodeResultToItem(result: BarcodeFoodLookupResult): ChatFoodItem {
  return {
    name: result.brand ? `${result.foodName} (${result.brand})` : result.foodName,
    quantityLabel: result.quantityLabel,
    quantityGrams: result.quantityGrams.trim() ? toNumberOr(result.quantityGrams, 0) : null,
    calories: toNumberOr(result.calories, 0),
    proteinGrams: toNumberOr(result.protein, 0),
    carbsGrams: toNumberOr(result.carbs, 0),
    fatGrams: toNumberOr(result.fat, 0),
    ...result.nutrients,
    barcode: result.barcode,
  };
}

function recentFoodToItem(recent: RecentFood): ChatFoodItem {
  return {
    name: recent.name,
    quantityLabel: recent.quantityLabel,
    quantityGrams: recent.quantityGrams,
    calories: recent.totalCalories,
    proteinGrams: recent.proteinGrams,
    carbsGrams: recent.carbsGrams,
    fatGrams: recent.fatGrams,
    ...pickNutrients(recent),
    barcode: recent.barcode,
  };
}

type AssistantMessage = Extract<ChatMessage, { role: 'assistant' }>;

function createAssistantMessage(
  fields: Pick<AssistantMessage, 'text' | 'intent'> & Partial<AssistantMessage>
): AssistantMessage {
  return {
    id: createEntityId('chat'),
    role: 'assistant',
    items: [],
    mealTime: null,
    imageUri: null,
    followUps: [],
    loggedItemIndexes: [],
    createdAt: new Date().toISOString(),
    ...fields,
  };
}

async function buildDaySummary() {
  const [profile, summary] = await Promise.all([
    getUserProfile(),
    getDailyNutritionSummary(new Date()),
  ]);

  if (!profile) {
    return null;
  }

  return [
    `target ${summary.calorieTarget} kcal, eaten ${Math.round(summary.consumedCalories)} kcal`,
    `protein ${Math.round(summary.proteinGrams)}/${profile.proteinTargetGrams} g`,
    `carbs ${Math.round(summary.carbsGrams)}/${profile.carbsTargetGrams} g`,
    `fat ${Math.round(summary.fatGrams)}/${profile.fatTargetGrams} g`,
    ...NUTRIENTS.flatMap(({ key, unit, dailyValue, direction }) => {
      const value = summary.nutrients[key];
      const reference = direction === 'limit' ? `limit ${dailyValue}` : dailyValue;
      return value === null ? [] : [`${key} ${Math.round(value)}/${reference} ${unit}`];
    }),
  ].join(', ');
}

/**
 * In-memory chat with Check AI. Messages are not persisted; logged foods go to the diary.
 */
export function useFoodChat() {
  const { t, i18n } = useTranslation();
  const markFoodEntriesChanged = useFoodEntryRefreshStore((state) => state.markFoodEntriesChanged);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      text: t('chat.welcome'),
      intent: 'welcome',
      items: [],
      mealTime: null,
      imageUri: null,
      followUps: [t('chat.followUps.logBreakfast'), t('chat.followUps.suggestDinner')],
      loggedItemIndexes: [],
      createdAt: new Date().toISOString(),
    },
  ]);
  const [isSending, setIsSending] = useState(false);
  /** `${messageId}:${itemIndex | 'all'}` of the save in progress. */
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const sendingRef = useRef(false);

  const sendMessage = useCallback(
    async (text: string, imageUri: string | null = null) => {
      const trimmed = text.trim();

      if (sendingRef.current || (!trimmed && !imageUri)) {
        return;
      }

      sendingRef.current = true;
      setIsSending(true);
      setMessages((previous) => [
        ...previous,
        {
          id: createEntityId('chat'),
          role: 'user',
          text: trimmed,
          imageUri,
          createdAt: new Date().toISOString(),
        },
      ]);

      try {
        await applyDevChatScenario();
        const result = await analyzeFoodChatMessage(
          trimmed || t('chat.photoOnlyPrompt'),
          {
            language: i18n.language === 'en' ? 'en' : 'vi',
            daySummary: await buildDaySummary(),
          },
          imageUri
        );

        setMessages((previous) => [
          ...previous,
          {
            id: createEntityId('chat'),
            role: 'assistant',
            text: result.reply || t('chat.fallbackReply'),
            intent: result.intent,
            items: result.items,
            mealTime: result.mealTime,
            imageUri: result.intent === 'log' ? imageUri : null,
            followUps: result.followUps,
            loggedItemIndexes: [],
            createdAt: new Date().toISOString(),
          },
        ]);
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        let replyText = t('chat.errorReply');

        if (isQuotaError(message)) {
          replyText = t('common.aiQuotaExceeded');
        } else if (isAuthError(message)) {
          replyText = t('common.signInRequired');
        }

        setMessages((previous) => [
          ...previous,
          {
            id: createEntityId('chat'),
            role: 'assistant',
            text: replyText,
            intent: 'error',
            items: [],
            mealTime: null,
            imageUri: null,
            followUps: [],
            loggedItemIndexes: [],
            createdAt: new Date().toISOString(),
          },
        ]);
      } finally {
        sendingRef.current = false;
        setIsSending(false);
      }
    },
    [i18n.language, t]
  );

  /**
   * Saves a message's foods. Logged meals save every item at once; for suggestions the user
   * picks one dish, so `itemIndex` saves just that item.
   */
  const logMessageItems = useCallback(
    async (messageId: string, itemIndex?: number) => {
      const message = messages.find((item) => item.id === messageId);

      if (!message || message.role !== 'assistant' || message.items.length === 0) {
        return false;
      }

      const indexes =
        itemIndex === undefined ? message.items.map((_, index) => index) : [itemIndex];
      const pending = indexes.filter((index) => !message.loggedItemIndexes.includes(index));

      if (pending.length === 0) {
        return false;
      }

      setSavingKey(`${messageId}:${itemIndex ?? 'all'}`);

      try {
        await logFoodItems(
          pending.map((index) => {
            const item = message.items[index];
            return {
              name: item.name,
              quantityLabel: item.quantityLabel,
              quantityGrams: item.quantityGrams,
              calories: item.calories,
              proteinGrams: item.proteinGrams,
              carbsGrams: item.carbsGrams,
              fatGrams: item.fatGrams,
              ...pickNutrients(item),
              barcode: item.barcode,
            };
          }),
          { imageUri: message.imageUri, consumedAt: resolveConsumedAt(message.mealTime) }
        );
        markFoodEntriesChanged();
        setMessages((previous) =>
          previous.map((item) =>
            item.id === messageId && item.role === 'assistant'
              ? { ...item, loggedItemIndexes: [...item.loggedItemIndexes, ...pending] }
              : item
          )
        );
        return true;
      } finally {
        setSavingKey(null);
      }
    },
    [markFoodEntriesChanged, messages]
  );

  /** Looks up a scanned barcode and offers the product as a loggable card. */
  const addBarcodeProduct = useCallback(
    async (barcode: string) => {
      if (sendingRef.current) {
        return;
      }

      sendingRef.current = true;
      setIsSending(true);
      setMessages((previous) => [
        ...previous,
        {
          id: createEntityId('chat'),
          role: 'user',
          text: t('chat.barcodeMessage', { code: barcode }),
          imageUri: null,
          createdAt: new Date().toISOString(),
        },
      ]);

      try {
        const result = await lookupFoodByBarcode(barcode);
        const reply = result
          ? createAssistantMessage({
              text: t('chat.barcodeFound', { name: result.foodName }),
              intent: 'log',
              items: [barcodeResultToItem(result)],
            })
          : createAssistantMessage({
              text: t('chat.barcodeNotFound', { code: barcode }),
              intent: 'error',
            });

        setMessages((previous) => [...previous, reply]);
      } catch {
        setMessages((previous) => [
          ...previous,
          createAssistantMessage({ text: t('chat.barcodeLookupFailed'), intent: 'error' }),
        ]);
      } finally {
        sendingRef.current = false;
        setIsSending(false);
      }
    },
    [t]
  );

  /** One-tap re-log of a recent food; the card in the chat confirms it was saved. */
  const logRecent = useCallback(
    async (recent: RecentFood) => {
      await logRecentFood(recent.id);
      markFoodEntriesChanged();
      setMessages((previous) => [
        ...previous,
        createAssistantMessage({
          text: t('chat.recentLogged', { name: recent.name }),
          intent: 'log',
          items: [recentFoodToItem(recent)],
          loggedItemIndexes: [0],
        }),
      ]);
    },
    [markFoodEntriesChanged, t]
  );

  return {
    messages,
    isSending,
    savingKey,
    sendMessage,
    logMessageItems,
    addBarcodeProduct,
    logRecent,
  };
}
