import { STORAGE_KEYS } from '@/utils/storage/constants';
import { getItem, setItem } from '@/utils/storage/storage';
import { createEntityId, formatDateKey, nowIsoString } from '../utils/calorie';
import type { HomeNutritionReviewDraft } from './geminiHomeNutritionReview';

export type HomeAiReviewStatus = 'ready' | 'need_more_info' | 'unsupported' | 'error';

export interface HomeAiReviewHistoryRecord {
  id: string;
  reviewDateKey: string;
  createdAt: string;
  status: HomeAiReviewStatus;
  review: HomeNutritionReviewDraft | null;
  assistantMessage: string | null;
}

const MAX_HISTORY_RECORDS = 120;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isHomeAiReviewDraft(value: unknown): value is HomeNutritionReviewDraft {
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

function isHomeAiReviewHistoryRecord(value: unknown): value is HomeAiReviewHistoryRecord {
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
    (value.review === null || isHomeAiReviewDraft(value.review)) &&
    (typeof value.assistantMessage === 'string' || value.assistantMessage === null)
  );
}

function loadHistoryRecords(): HomeAiReviewHistoryRecord[] {
  const result = getItem<unknown[]>(STORAGE_KEYS.app.homeAiReviewHistory);

  if (!result.success || !Array.isArray(result.data)) {
    return [];
  }

  return result.data
    .filter(isHomeAiReviewHistoryRecord)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, MAX_HISTORY_RECORDS);
}

function persistHistoryRecords(records: HomeAiReviewHistoryRecord[]) {
  return setItem(STORAGE_KEYS.app.homeAiReviewHistory, records.slice(0, MAX_HISTORY_RECORDS));
}

export function getHomeAiReviewHistoryRecords(): HomeAiReviewHistoryRecord[] {
  return loadHistoryRecords();
}

export function getHomeAiReviewHistoryRecordsByDate(date: Date): HomeAiReviewHistoryRecord[] {
  const dateKey = formatDateKey(date);
  return loadHistoryRecords().filter((record) => record.reviewDateKey === dateKey);
}

export function getLatestHomeAiReviewHistoryRecord(date: Date): HomeAiReviewHistoryRecord | null {
  return getHomeAiReviewHistoryRecordsByDate(date)[0] ?? null;
}

export function saveHomeAiReviewHistoryRecord(input: {
  reviewDate: Date;
  status: HomeAiReviewStatus;
  review: HomeNutritionReviewDraft | null;
  assistantMessage: string | null;
}): HomeAiReviewHistoryRecord {
  const nextRecord: HomeAiReviewHistoryRecord = {
    id: createEntityId('home-ai-review'),
    reviewDateKey: formatDateKey(input.reviewDate),
    createdAt: nowIsoString(),
    status: input.status,
    review: input.review,
    assistantMessage: input.assistantMessage,
  };

  const nextHistory = [nextRecord, ...loadHistoryRecords()].slice(0, MAX_HISTORY_RECORDS);
  persistHistoryRecords(nextHistory);

  return nextRecord;
}
