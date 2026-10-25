import type { AchievementDefinition } from '../types';

export const ACHIEVEMENTS: AchievementDefinition[] = [
  { id: 'streak_7', icon: 'flame', target: 7, metric: (stats) => stats.longestStreak },
  {
    id: 'on_target_7',
    icon: 'shield-checkmark',
    target: 7,
    metric: (stats) => stats.onTargetDays,
  },
  { id: 'protein_5', icon: 'barbell', target: 5, metric: (stats) => stats.proteinDays },
  { id: 'entries_10', icon: 'restaurant', target: 10, metric: (stats) => stats.totalEntries },
  { id: 'streak_14', icon: 'heart', target: 14, metric: (stats) => stats.longestStreak },
  { id: 'balanced_7', icon: 'nutrition', target: 7, metric: (stats) => stats.balancedDays },
  { id: 'streak_30', icon: 'ribbon', target: 30, metric: (stats) => stats.longestStreak },
  {
    id: 'entries_100',
    icon: 'restaurant',
    target: 100,
    metric: (stats) => stats.totalEntries,
  },
];
