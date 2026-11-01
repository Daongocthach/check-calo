import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Icon, Text, type IconProps } from '@/common/components';
import { useDayFoodLog } from '../../hooks/useDayFoodLog';
import { useRecentFoodPool } from '../../hooks/useRecentFoods';
import type { ChatFoodItem } from '../../services/foodAnalyzer';
import type { RecentFood } from '../../types';
import { formatWholeNumber } from '../../utils/format';
import {
  evaluateMealImpact,
  type MealImpactAction,
  type MealImpactLine,
  type MealPortion,
} from '../../utils/mealImpact';
import { getMealSlot } from '../../utils/mealSlot';
import { sumNutrients } from '../../utils/nutrients';

export interface MealImpactCardProps {
  items: ChatFoodItem[];
  /** When the meal would be saved; picks the day and the meal slot. */
  consumedAt: string;
  disabled: boolean;
  onLogPortion: (portion: MealPortion) => void;
  onLogFood: (food: RecentFood) => void;
  onAsk: (text: string) => void;
}

const ACTION_ICONS: Record<MealImpactAction['kind'], IconProps['name']> = {
  portion: 'pie-chart-outline',
  alternative: 'swap-horizontal',
  askAi: 'sparkles',
};

/**
 * "After this meal": what saving the card's foods leaves for the rest of today, and when the
 * meal does not fit, a smaller portion or a lighter food the user already eats.
 */
export function MealImpactCard({
  items,
  consumedAt,
  disabled,
  onLogPortion,
  onLogFood,
  onAsk,
}: MealImpactCardProps) {
  const { t, i18n } = useTranslation();
  const formatKcal = (value: number) => formatWholeNumber(value, i18n.language);
  const consumedDate = useMemo(() => new Date(consumedAt), [consumedAt]);
  const { data: dayLog } = useDayFoodLog(consumedDate);
  const recentFoods = useRecentFoodPool();
  const mealName = items.map((item) => item.name).join(', ');
  const impact = useMemo(() => {
    if (!dayLog) {
      return null;
    }

    return evaluateMealImpact({
      meal: {
        name: mealName,
        calories: items.reduce((total, item) => total + item.calories, 0),
        proteinGrams: items.reduce((total, item) => total + item.proteinGrams, 0),
        nutrients: sumNutrients(items),
      },
      day: dayLog.summary,
      consumedAt: consumedDate,
      slot: getMealSlot(consumedDate),
      recentFoods: recentFoods ?? [],
    });
  }, [consumedDate, dayLog, items, mealName, recentFoods]);

  if (!impact || impact.lines.length === 0) {
    return null;
  }

  const describeLine = (line: MealImpactLine) => {
    switch (line.kind) {
      case 'nextMeal':
        // With one meal left, "N left · dinner about N" would say the same number twice.
        return line.calories === line.remaining
          ? t(`mealImpact.lines.lastMeal.${line.slot}`, { calories: formatKcal(line.calories) })
          : t(`mealImpact.lines.nextMeal.${line.slot}`, {
              remaining: formatKcal(line.remaining),
              calories: formatKcal(line.calories),
            });
      case 'nutrientHigh':
        return t('mealImpact.lines.nutrientHigh', {
          nutrient: t(`nutrients.${line.nutrient}`),
          percent: line.percent,
        });
      case 'full':
        return t('mealImpact.lines.full');
      case 'heavy':
        return t('mealImpact.lines.heavy', { percent: line.percent });
      case 'proteinLow':
        return t('mealImpact.lines.proteinLow', { grams: line.grams });
      default:
        return t(`mealImpact.lines.${line.kind}`, { calories: formatKcal(line.calories) });
    }
  };

  const describeAction = (action: MealImpactAction) => {
    switch (action.kind) {
      case 'portion':
        return t('mealImpact.actions.portion', {
          portion: t(`mealImpact.portions.${action.portion}`),
          calories: formatKcal(action.calories),
        });
      case 'alternative':
        return t('mealImpact.actions.alternative', {
          name: action.food.name,
          calories: formatKcal(action.food.totalCalories),
        });
      case 'askAi':
        return t('mealImpact.actions.askAi');
    }
  };

  const runAction = (action: MealImpactAction) => {
    switch (action.kind) {
      case 'portion':
        onLogPortion(action.portion);
        return;
      case 'alternative':
        onLogFood(action.food);
        return;
      case 'askAi':
        onAsk(t('mealImpact.askPrompt', { name: mealName, calories: action.calories }));
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="caption" weight="semibold" color="secondary">
        {t('mealImpact.title')}
      </Text>
      {impact.lines.map((line) => (
        <Text key={line.kind} variant="bodySmall">
          {describeLine(line)}
        </Text>
      ))}
      {impact.actions.length > 0 ? (
        <View style={styles.actions}>
          {impact.actions.map((action) => (
            <Pressable
              key={action.kind}
              onPress={() => runAction(action)}
              disabled={disabled}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.action,
                pressed && styles.actionPressed,
                disabled && styles.actionDisabled,
              ]}
            >
              <Icon name={ACTION_ICONS[action.kind]} variant="brand" size={16} />
              <Text variant="bodySmall" color="link" numberOfLines={1} style={styles.actionText}>
                {describeAction(action)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    padding: theme.metrics.spacing.p16,
    gap: theme.metrics.spacingV.p8,
  },
  actionText: {
    flex: 1,
  },
  actions: {
    gap: theme.metrics.spacingV.p8,
    marginTop: theme.metrics.spacingV.p4,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p8,
    borderRadius: theme.metrics.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  actionPressed: {
    backgroundColor: theme.colors.background.surfaceAlt,
  },
  actionDisabled: {
    opacity: 0.5,
  },
}));
