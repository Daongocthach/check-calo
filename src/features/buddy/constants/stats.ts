import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import type { TopFoodMeasure } from '@/features/food-log/services/dailySummaryService';
import type { AxisScores, BuddyAxis } from '../types';

export const BUDDY_AXES: readonly BuddyAxis[] = [
  'calories',
  'nutrients',
  'quality',
  'timing',
  'meals',
  'consistency',
];

/** Every stat without data, e.g. while the stats load. */
export const EMPTY_AXIS_SCORES: AxisScores = {
  calories: null,
  nutrients: null,
  quality: null,
  timing: null,
  meals: null,
  consistency: null,
};

export const BUDDY_AXIS_ICONS: Record<BuddyAxis, ComponentProps<typeof Ionicons>['name']> = {
  calories: 'locate',
  nutrients: 'nutrition',
  quality: 'leaf',
  timing: 'time',
  meals: 'restaurant',
  consistency: 'calendar',
};

/** What the top-foods list ranks for each stat; null where no single nutrient drives it. */
export const BUDDY_AXIS_TOP_FOOD_MEASURE = {
  calories: 'calories',
  nutrients: 'protein',
  quality: 'sodium',
  timing: null,
  meals: null,
  consistency: null,
} as const satisfies Record<BuddyAxis, TopFoodMeasure | null>;

/**
 * Daily limits for healthy adults (WHO). Sugar is total sugar, so it leaves room for fruit
 * and milk on top of the free-sugar limit; trans fat is about 1 % of 2000 kcal.
 */
export const NUTRIENT_LIMITS = {
  sugarGrams: 65,
  sodiumMg: 2000,
  transFatGrams: 2.2,
  cholesterolMg: 300,
} as const;

/** Saturated fat stays under this share of the day's calorie target. */
export const SATURATED_FAT_MAX_SHARE = 0.1;

/** Fiber scales with how much one eats: 14 g per 1000 kcal, kept within 20-35 g. */
export const FIBER_GRAMS_PER_1000_KCAL = 14;
export const FIBER_TARGET_RANGE = { min: 20, max: 35 } as const;

/**
 * Nutrition quality is only judged on a day where at least this share of the calories comes
 * from food with fiber, sugar or sodium known; otherwise unknown food would read as none.
 */
export const NUTRIENT_COVERAGE_MIN = 0.7;

/** Calories this far outside the on-target range, as a share of the target, score 0. */
export const CALORIE_SCORE_FALLOFF = 0.5;

export const MAIN_MEALS_PER_DAY = 3;

/** Points a day loses for eating late at night. */
export const LATE_NIGHT_PENALTY = 30;

/** A stat needs this many days of data before it is shown. */
export const MIN_SCORED_DAYS = 3;
export const RECENT_DAYS = 7;

/** A score this high means the day met the stat's goal. */
export const MET_SCORE = 100;

/** Score bands for colouring a day: met, close, off. */
export const SCORE_BANDS = { good: 80, fair: 50 } as const;
