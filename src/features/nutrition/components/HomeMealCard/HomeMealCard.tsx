import { createContext, useContext, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Card, Icon, Text } from '@/common/components';
import { FoodImagePreview } from '@/features/nutrition/components/FoodImagePreview';
import type { FavoriteFood, FoodEntry } from '@/features/nutrition/types';
import { formatMealWeight } from '@/features/nutrition/utils/quantity';

export interface HomeMealCardItem {
  title: string;
  quantityLabel: string;
  quantityGrams?: number | null;
  totalCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  imageUri?: string | null;
  thumbnailUri?: string | null;
  devSyncBadgeLabel?: string | null;
  isFavorite: boolean;
}

interface HomeMealCardContextValue {
  item: HomeMealCardItem;
  quantityDisplay: string;
}

const HomeMealCardContext = createContext<HomeMealCardContextValue | null>(null);

function useHomeMealCardContext() {
  const context = useContext(HomeMealCardContext);

  if (!context) {
    throw new Error('HomeMealCard compound components must be used within HomeMealCard.Root');
  }

  return context;
}

interface RootProps {
  item: HomeMealCardItem;
  onPress: () => void;
  children: ReactNode;
}

function Root({ item, onPress, children }: RootProps) {
  const { t } = useTranslation();
  const quantityDisplay = formatMealWeight(
    item.quantityGrams,
    item.quantityLabel,
    t('common.units.gram')
  );

  return (
    <HomeMealCardContext.Provider value={{ item, quantityDisplay }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.title}
        style={styles.mealPressable}
        onPress={onPress}
      >
        <Card variant="elevated" style={styles.mealCard}>
          <View style={styles.mealMainRow}>{children}</View>
        </Card>
      </Pressable>
    </HomeMealCardContext.Provider>
  );
}

function Preview() {
  const { item } = useHomeMealCardContext();

  return (
    <FoodImagePreview
      imageUri={item.imageUri}
      thumbnailUri={item.thumbnailUri}
      devSyncBadgeLabel={item.devSyncBadgeLabel}
      style={styles.mealPreview}
    />
  );
}

function Content({ children }: { children: ReactNode }) {
  return <View style={styles.mealCopy}>{children}</View>;
}

function Header({ children }: { children?: ReactNode }) {
  const { item, quantityDisplay } = useHomeMealCardContext();

  return (
    <View style={styles.mealHeaderRow}>
      <View style={styles.mealTitleBlock}>
        <Text variant="body" weight="semibold" numberOfLines={2}>
          {item.title}
        </Text>
        <Text variant="caption" color="secondary" numberOfLines={1}>
          {quantityDisplay}
        </Text>
      </View>
      {children ? <View style={styles.headerActions}>{children}</View> : null}
    </View>
  );
}

function FavoriteAction({ onPress }: { onPress: () => void | Promise<void> }) {
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.edit')}
      style={styles.favoriteButton}
      onPress={(event) => {
        event.stopPropagation();
        void onPress();
      }}
    >
      <Icon name="create-outline" size={18} variant="primary" />
    </Pressable>
  );
}

interface MacrosProps {
  proteinTargetGrams?: number;
  carbsTargetGrams?: number;
  fatTargetGrams?: number;
}

function Macros({ proteinTargetGrams, carbsTargetGrams, fatTargetGrams }: MacrosProps) {
  const { item } = useHomeMealCardContext();
  const { t } = useTranslation();
  const totalCalories = Math.round(item.totalCalories);
  const proteinPercent =
    proteinTargetGrams && proteinTargetGrams > 0
      ? Math.min(100, Math.round((item.proteinGrams / proteinTargetGrams) * 100))
      : 0;
  const carbsPercent =
    carbsTargetGrams && carbsTargetGrams > 0
      ? Math.min(100, Math.round((item.carbsGrams / carbsTargetGrams) * 100))
      : 0;
  const fatPercent =
    fatTargetGrams && fatTargetGrams > 0
      ? Math.min(100, Math.round((item.fatGrams / fatTargetGrams) * 100))
      : 0;

  return (
    <View style={styles.macroPanel}>
      <View style={styles.energyColumn}>
        <Text variant="caption" color="secondary">
          {t('homeScreen.meals.totalEnergy')}
        </Text>
        <View style={styles.energyValueRow}>
          <Text variant="body" weight="bold">
            {totalCalories}
          </Text>
          <Text variant="bodySmall" color="secondary">
            {t('common.units.kcal')}
          </Text>
        </View>
      </View>

      <View style={styles.macroDivider} />

      <View style={styles.macroColumns}>
        <MacroStat
          label={t('statsScreen.macros.protein')}
          value={Math.round(item.proteinGrams)}
          unit={t('common.units.gram')}
          tone="success"
          percent={proteinPercent}
        />
        <MacroStat
          label={t('statsScreen.macros.carbs')}
          value={Math.round(item.carbsGrams)}
          unit={t('common.units.gram')}
          tone="warning"
          percent={carbsPercent}
        />
        <MacroStat
          label={t('statsScreen.macros.fat')}
          value={Math.round(item.fatGrams)}
          unit={t('common.units.gram')}
          tone="error"
          percent={fatPercent}
        />
      </View>
    </View>
  );
}

interface MacroStatProps {
  label: string;
  value: number;
  unit: string;
  tone: 'success' | 'warning' | 'error';
  percent: number;
}

function MacroStat({ label, value, unit, tone, percent }: MacroStatProps) {
  return (
    <View style={styles.macroStat}>
      <Text variant="caption" color="secondary" numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.macroStatValueRow}>
        <Text variant="caption" weight="semibold">
          {value}
        </Text>
        <Text variant="caption" color="secondary">
          {unit}
        </Text>
      </View>
      <View style={styles.macroTrack}>
        <View
          style={[
            styles.macroFill,
            tone === 'success' && styles.macroFillSuccess,
            tone === 'warning' && styles.macroFillWarning,
            tone === 'error' && styles.macroFillError,
            { width: `${Math.max(12, percent)}%` },
          ]}
        />
      </View>
    </View>
  );
}

function Actions({ children }: { children: ReactNode }) {
  return <View style={styles.actionRow}>{children}</View>;
}

interface ActionButtonProps {
  icon: 'create-outline' | 'trash-outline' | 'ellipsis-vertical';
  label: string;
  onPress: () => void;
  tone?: 'default' | 'danger';
}

function ActionButton({ icon, label, onPress, tone = 'default' }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.favoriteButton, tone === 'danger' && styles.actionButtonDanger]}
      onPress={(event) => {
        event.stopPropagation();
        onPress();
      }}
    >
      <Icon name={icon} size={16} destructive={tone === 'danger'} />
    </Pressable>
  );
}

export const HomeMealCard = {
  Root,
  Preview,
  Content,
  Header,
  FavoriteAction,
  Macros,
  Actions,
  ActionButton,
};

const styles = StyleSheet.create((theme) => ({
  mealPressable: {
    flex: 1,
  },
  mealCard: {
    flex: 1,
    backgroundColor: theme.colors.background.surface,
    paddingHorizontal: theme.metrics.spacing.p12,
    paddingVertical: theme.metrics.spacingV.p12,
    borderRadius: theme.metrics.borderRadius.xl,
  },
  mealMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
  },
  mealCopy: {
    flex: 1,
    justifyContent: 'space-between',
    gap: theme.metrics.spacingV.p8,
  },
  mealHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.metrics.spacing.p8,
  },
  mealTitleBlock: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
  },
  favoriteButton: {
    width: theme.metrics.spacing.p36,
    height: theme.metrics.spacing.p36,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.section,
  },
  macroPanel: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor: theme.colors.background.surfaceAlt,
    paddingHorizontal: theme.metrics.spacing.p8,
    paddingVertical: theme.metrics.spacingV.p8,
    gap: theme.metrics.spacing.p8,
  },
  energyColumn: {
    flex: 0.95,
    gap: theme.metrics.spacingV.p4,
    justifyContent: 'center',
  },
  energyValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.metrics.spacing.p4,
  },
  macroColumns: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: theme.metrics.spacing.p4,
  },
  macroDivider: {
    width: 1,
    backgroundColor: theme.colors.border.subtle,
  },
  mealPreview: {
    width: theme.metrics.spacing.p96,
    height: theme.metrics.spacing.p96,
    borderRadius: theme.metrics.borderRadius.lg,
  },
  macroStat: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  macroStatValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.metrics.spacing.p4,
  },
  macroTrack: {
    height: 4,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.background.surface,
    overflow: 'hidden',
  },
  macroFill: {
    height: '100%',
    borderRadius: theme.metrics.borderRadius.full,
  },
  macroFillSuccess: {
    backgroundColor: theme.colors.state.info,
  },
  macroFillWarning: {
    backgroundColor: theme.colors.state.warning,
  },
  macroFillError: {
    backgroundColor: theme.colors.state.success,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
  },
  actionButtonDanger: {
    backgroundColor: theme.colors.background.section,
  },
}));

export function toHomeMealCardItem(item: {
  mealName?: string;
  name?: string;
  quantityLabel: FoodEntry['quantityLabel'] | FavoriteFood['quantityLabel'];
  quantityGrams?: FoodEntry['quantityGrams'] | FavoriteFood['quantityGrams'];
  totalCalories: FoodEntry['totalCalories'] | FavoriteFood['totalCalories'];
  proteinGrams: FoodEntry['proteinGrams'] | FavoriteFood['proteinGrams'];
  carbsGrams: FoodEntry['carbsGrams'] | FavoriteFood['carbsGrams'];
  fatGrams: FoodEntry['fatGrams'] | FavoriteFood['fatGrams'];
  imageUri?: FoodEntry['imageUri'] | FavoriteFood['imageUri'];
  thumbnailUri?: FoodEntry['thumbnailUri'] | FavoriteFood['thumbnailUri'];
  devSyncBadgeLabel?: string | null;
  isFavorite: boolean;
}): HomeMealCardItem {
  return {
    title:
      'mealName' in item && typeof item.mealName === 'string' ? item.mealName : (item.name ?? ''),
    quantityLabel: item.quantityLabel,
    quantityGrams: item.quantityGrams,
    totalCalories: item.totalCalories,
    proteinGrams: item.proteinGrams,
    carbsGrams: item.carbsGrams,
    fatGrams: item.fatGrams,
    imageUri: item.imageUri,
    thumbnailUri: item.thumbnailUri,
    devSyncBadgeLabel: item.devSyncBadgeLabel ?? null,
    isFavorite: item.isFavorite,
  };
}
