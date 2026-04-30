import { STORAGE_KEYS } from '@/utils/storage/constants';
import { getItem, setItem } from '@/utils/storage/storage';
import { createEntityId, formatDateKey, nowIsoString } from '../utils/calorie';
import type { HomeNutritionReviewDraft } from './geminiHomeNutritionReview';

export type MenuAiReviewStatus = 'ready' | 'need_more_info' | 'unsupported' | 'error';

export interface MenuAiReviewHistoryRecord {
  id: string;
  reviewDateKey: string;
  createdAt: string;
  status: MenuAiReviewStatus;
  review: HomeNutritionReviewDraft | null;
  assistantMessage: string | null;
  reviewScope: 'day' | 'meal';
  mealLocalId: string | null;
  mealName: string | null;
}

const MAX_HISTORY_RECORDS = 120;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isHomeNutritionReviewDraft(value: unknown): value is HomeNutritionReviewDraft {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.title === 'string' &&
    typeof value.summary === 'string' &&
    isStringArray(value.strengths) &&
    isStringArray(value.improvements) &&
    (typeof value.nextAction === 'string' || value.nextAction === null) &&
    (typeof value.confidence === 'number' || value.confidence === null)
  );
}

function isMenuAiReviewHistoryRecord(value: unknown): value is MenuAiReviewHistoryRecord {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.reviewDateKey === 'string' &&
    typeof value.createdAt === 'string' &&
    (value.status === 'ready' ||
      value.status === 'need_more_info' ||
      value.status === 'unsupported' ||
      value.status === 'error') &&
    (value.review === null || isHomeNutritionReviewDraft(value.review)) &&
    (typeof value.assistantMessage === 'string' || value.assistantMessage === null) &&
    (value.reviewScope === 'day' || value.reviewScope === 'meal') &&
    (typeof value.mealLocalId === 'string' || value.mealLocalId === null) &&
    (typeof value.mealName === 'string' || value.mealName === null)
  );
}

function loadHistoryRecords(): MenuAiReviewHistoryRecord[] {
  const result = getItem<unknown[]>(STORAGE_KEYS.app.menuAiReviewHistory);

  if (!result.success || !Array.isArray(result.data)) {
    return [];
  }

  return result.data
    .filter(isMenuAiReviewHistoryRecord)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, MAX_HISTORY_RECORDS);
}

function persistHistoryRecords(records: MenuAiReviewHistoryRecord[]) {
  return setItem(STORAGE_KEYS.app.menuAiReviewHistory, records.slice(0, MAX_HISTORY_RECORDS));
}

export function getMenuAiReviewHistoryRecords(): MenuAiReviewHistoryRecord[] {
  return loadHistoryRecords();
}

export function getMenuAiReviewHistoryRecordsByDate(date: Date): MenuAiReviewHistoryRecord[] {
  const dateKey = formatDateKey(date);
  return loadHistoryRecords().filter((record) => record.reviewDateKey === dateKey);
}

export function getLatestMenuAiReviewHistoryRecord(date: Date): MenuAiReviewHistoryRecord | null {
  return getMenuAiReviewHistoryRecordsByDate(date)[0] ?? null;
}

export function saveMenuAiReviewHistoryRecord(input: {
  reviewDate: Date;
  status: MenuAiReviewStatus;
  review: HomeNutritionReviewDraft | null;
  assistantMessage: string | null;
  reviewScope: 'day' | 'meal';
  mealLocalId: string | null;
  mealName: string | null;
}): MenuAiReviewHistoryRecord {
  const nextRecord: MenuAiReviewHistoryRecord = {
    id: createEntityId('menu-ai-review'),
    reviewDateKey: formatDateKey(input.reviewDate),
    createdAt: nowIsoString(),
    status: input.status,
    review: input.review,
    assistantMessage: input.assistantMessage,
    reviewScope: input.reviewScope,
    mealLocalId: input.mealLocalId,
    mealName: input.mealName,
  };

  const nextHistory = [nextRecord, ...loadHistoryRecords()].slice(0, MAX_HISTORY_RECORDS);
  persistHistoryRecords(nextHistory);

  return nextRecord;
}
