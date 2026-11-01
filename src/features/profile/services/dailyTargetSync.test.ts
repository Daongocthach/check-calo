import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { DailyTargetRecord } from '../types';
import {
  applyCloudDailyTargets,
  listPendingDailyTargets,
  markDailyTargetsSynced,
  type PendingDailyTarget,
} from './dailyTargetRepository';
import { pullDailyTargetsFromCloud, pushPendingDailyTargets } from './dailyTargetSync';

type UpsertOptions = { onConflict: string; ignoreDuplicates: boolean };
type PageResult = { data: unknown[] | null; error: { message: string } | null };

const mockUpsert =
  jest.fn<(rows: unknown[], options: UpsertOptions) => Promise<{ error: unknown }>>();
const mockRange = jest.fn<(from: number, to: number) => PageResult>();

jest.mock('@/integrations/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user: { id: 'user-1' } } } }),
    },
    from: () => ({
      upsert: (rows: unknown[], options: UpsertOptions) => mockUpsert(rows, options),
      select: () => ({
        order: () => ({
          range: (from: number, to: number) => ({
            returns: () => Promise.resolve(mockRange(from, to)),
          }),
        }),
      }),
    }),
  },
}));

jest.mock('./dailyTargetRepository', () => ({
  applyCloudDailyTargets: jest.fn(() => Promise.resolve(0)),
  listPendingDailyTargets: jest.fn(),
  markDailyTargetsSynced: jest.fn(() => Promise.resolve()),
}));

const mockApply = jest.mocked(applyCloudDailyTargets);
const mockListPending = jest.mocked(listPendingDailyTargets);
const mockMarkSynced = jest.mocked(markDailyTargetsSynced);

function target(date: string, overrides: Partial<PendingDailyTarget> = {}): PendingDailyTarget {
  return {
    date,
    calorieTarget: 1800,
    proteinTargetGrams: 120,
    carbsTargetGrams: 200,
    fatTargetGrams: 60,
    goalMode: 'lose',
    source: 'profile',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
    overwrite: true,
    ...overrides,
  };
}

function cloudRow(date: string) {
  return {
    target_date: date,
    calorie_target: 1800,
    protein_target_grams: '120',
    carbs_target_grams: null,
    fat_target_grams: 60,
    goal_mode: 'lose',
    source: 'profile',
    created_at: '2026-10-01T08:00:00.123+00:00',
    updated_at: '2026-10-01T08:00:00.123+00:00',
  };
}

beforeEach(() => {
  mockUpsert.mockReset().mockResolvedValue({ error: null });
  mockRange.mockReset().mockReturnValue({ data: [], error: null });
  mockApply.mockClear();
  mockListPending.mockReset().mockResolvedValue([]);
  mockMarkSynced.mockClear();
});

describe('pushPendingDailyTargets', () => {
  it('overwrites changed plans but only adds frozen plans the cloud does not have', async () => {
    const changed = target('2026-10-02');
    const frozen = target('2026-10-01', { overwrite: false });
    mockListPending.mockResolvedValue([frozen, changed]);

    await expect(pushPendingDailyTargets()).resolves.toBe(true);

    expect(mockUpsert).toHaveBeenCalledTimes(2);
    expect(mockUpsert.mock.calls[0][0]).toEqual([
      expect.objectContaining({ user_id: 'user-1', target_date: '2026-10-02' }),
    ]);
    expect(mockUpsert.mock.calls[0][1]).toEqual({
      onConflict: 'user_id,target_date',
      ignoreDuplicates: false,
    });
    expect(mockUpsert.mock.calls[1][0]).toEqual([
      expect.objectContaining({ target_date: '2026-10-01' }),
    ]);
    expect(mockUpsert.mock.calls[1][1]).toEqual({
      onConflict: 'user_id,target_date',
      ignoreDuplicates: true,
    });
    expect(mockMarkSynced).toHaveBeenCalledWith([changed]);
    expect(mockMarkSynced).toHaveBeenCalledWith([frozen]);
  });

  it('keeps plans pending when the push fails', async () => {
    mockListPending.mockResolvedValue([target('2026-10-02')]);
    mockUpsert.mockResolvedValue({ error: { message: 'offline' } });

    await expect(pushPendingDailyTargets()).resolves.toBe(false);

    expect(mockMarkSynced).not.toHaveBeenCalled();
  });
});

describe('pullDailyTargetsFromCloud', () => {
  it('keeps the local plans when the account has none in the cloud', async () => {
    await pullDailyTargetsFromCloud({ replace: true });

    expect(mockApply).not.toHaveBeenCalled();
  });

  it('keeps the local plans when the pull fails', async () => {
    mockRange.mockReturnValue({ data: null, error: { message: 'offline' } });

    await pullDailyTargetsFromCloud({ replace: true });

    expect(mockApply).not.toHaveBeenCalled();
  });

  it('maps cloud rows to local plans with ISO timestamps', async () => {
    mockRange.mockReturnValue({ data: [cloudRow('2026-10-01')], error: null });

    await pullDailyTargetsFromCloud({ replace: true });

    expect(mockApply).toHaveBeenCalledWith(
      [
        {
          date: '2026-10-01',
          calorieTarget: 1800,
          proteinTargetGrams: 120,
          carbsTargetGrams: null,
          fatTargetGrams: 60,
          goalMode: 'lose',
          source: 'profile',
          createdAt: '2026-10-01T08:00:00.123Z',
          updatedAt: '2026-10-01T08:00:00.123Z',
        } satisfies DailyTargetRecord,
      ],
      { replace: true }
    );
  });

  it('reads every page when there are more plans than one response holds', async () => {
    const fullPage = Array.from({ length: 1000 }, (_, index) => cloudRow(`day-${index}`));
    mockRange
      .mockReturnValueOnce({ data: fullPage, error: null })
      .mockReturnValueOnce({ data: [cloudRow('2029-01-01')], error: null });

    await pullDailyTargetsFromCloud();

    expect(mockRange.mock.calls).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    expect(mockApply.mock.calls[0][0]).toHaveLength(1001);
  });
});
