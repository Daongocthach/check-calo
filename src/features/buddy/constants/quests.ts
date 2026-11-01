import type { BuddyQuest, QuestKind, QuestMetric } from '../types';

/** Completion row holding the points earned under the old rules, before quests existed. */
export const LEGACY_QUEST_ID = 'legacy';

export const QUEST_KINDS: readonly QuestKind[] = ['daily', 'weekly', 'special'];

export const QUEST_METRICS: readonly QuestMetric[] = [
  'first_log',
  'calorie_goal',
  'diverse_menu',
  'within_limits',
  'fiber_enough',
  'pet_level_up',
  'weight_goal_reached',
  'create_account',
];

/** Each of protein, carbs and fat brings at least this share of the day's calories. */
export const DIVERSE_MIN_SHARE = 0.1;

/** Remote quest list kept for a while before asking Supabase again. */
export const QUEST_CONFIG_STALE_MS = 60 * 60 * 1000;

const BASE = { goalModes: null, startsAt: null, endsAt: null } as const;

/**
 * The quests shipped with the app, used offline, without Supabase, or until the remote list
 * (`buddy_quests`) loads. Keep in step with the seed in the Supabase migration.
 */
export const DEFAULT_QUESTS: BuddyQuest[] = [
  {
    ...BASE,
    id: 'day_first_log',
    kind: 'daily',
    metric: 'first_log',
    requiredDays: 1,
    points: 5,
    title: { vi: 'Ghi món đầu tiên trong ngày', en: 'Log your first food today' },
    icon: 'create',
    sortOrder: 10,
  },
  {
    ...BASE,
    id: 'day_calorie_goal',
    kind: 'daily',
    metric: 'calorie_goal',
    requiredDays: 1,
    points: 20,
    title: { vi: 'Đạt mục tiêu calo', en: 'Hit your calorie goal' },
    icon: 'locate',
    sortOrder: 20,
  },
  {
    ...BASE,
    id: 'day_diverse',
    kind: 'daily',
    metric: 'diverse_menu',
    requiredDays: 1,
    points: 10,
    title: { vi: 'Thực đơn đủ đạm, tinh bột, béo', en: 'Protein, carbs and fat on the menu' },
    icon: 'nutrition',
    sortOrder: 30,
  },
  {
    ...BASE,
    id: 'day_limits',
    kind: 'daily',
    metric: 'within_limits',
    requiredDays: 1,
    points: 15,
    title: {
      vi: 'Không vượt mức đường, muối, chất béo xấu',
      en: 'Stay under sugar, salt and bad fat limits',
    },
    icon: 'shield-checkmark',
    sortOrder: 40,
  },
  {
    ...BASE,
    id: 'day_fiber',
    kind: 'daily',
    metric: 'fiber_enough',
    requiredDays: 1,
    points: 15,
    title: { vi: 'Ăn đủ chất xơ', en: 'Eat enough fiber' },
    icon: 'leaf',
    sortOrder: 50,
  },
  {
    ...BASE,
    id: 'week_log',
    kind: 'weekly',
    metric: 'first_log',
    requiredDays: 7,
    points: 50,
    title: { vi: 'Ghi món đủ 7 ngày', en: 'Log food all 7 days' },
    icon: 'calendar',
    sortOrder: 10,
  },
  {
    ...BASE,
    id: 'week_calorie_goal',
    kind: 'weekly',
    metric: 'calorie_goal',
    requiredDays: 5,
    points: 150,
    title: { vi: 'Đạt mục tiêu calo 5/7 ngày', en: 'Hit your calorie goal 5 of 7 days' },
    icon: 'locate',
    sortOrder: 20,
  },
  {
    ...BASE,
    id: 'week_limits',
    kind: 'weekly',
    metric: 'within_limits',
    requiredDays: 7,
    points: 100,
    title: { vi: 'Cả tuần không vượt mức khuyến cáo', en: 'Stay under the limits all week' },
    icon: 'shield-checkmark',
    sortOrder: 30,
  },
  {
    ...BASE,
    id: 'week_fiber',
    kind: 'weekly',
    metric: 'fiber_enough',
    requiredDays: 7,
    points: 100,
    title: { vi: 'Ngày nào cũng đủ chất xơ', en: 'Enough fiber every day' },
    icon: 'leaf',
    sortOrder: 40,
  },
  {
    ...BASE,
    id: 'week_diverse',
    kind: 'weekly',
    metric: 'diverse_menu',
    requiredDays: 7,
    points: 50,
    title: { vi: 'Ngày nào cũng đủ đạm, tinh bột, béo', en: 'Protein, carbs and fat every day' },
    icon: 'nutrition',
    sortOrder: 50,
  },
  {
    ...BASE,
    id: 'special_level_up',
    kind: 'special',
    metric: 'pet_level_up',
    requiredDays: 1,
    points: 0,
    title: { vi: 'Thăng cấp thú cưng', en: 'Level up your pet' },
    icon: 'trending-up',
    sortOrder: 10,
  },
  {
    ...BASE,
    id: 'special_weight_goal',
    kind: 'special',
    metric: 'weight_goal_reached',
    requiredDays: 1,
    points: 300,
    title: { vi: 'Đạt mục tiêu cân nặng', en: 'Reach your weight goal' },
    icon: 'trophy',
    sortOrder: 20,
  },
  {
    ...BASE,
    id: 'special_account',
    kind: 'special',
    metric: 'create_account',
    requiredDays: 1,
    points: 100,
    title: { vi: 'Tạo tài khoản để giữ dữ liệu', en: 'Create an account to keep your data' },
    icon: 'person-add',
    sortOrder: 30,
  },
];
