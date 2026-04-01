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
  const { t } = useTranslation();

  return (
    <FoodImagePreview
      imageUri={item.imageUri}
      thumbnailUri={item.thumbnailUri}
      devSyncBadgeLabel={item.devSyncBadgeLabel}
      style={styles.mealPreview}
    >
      <View style={styles.previewCalories}>
        <Text variant="caption" weight="semibold" color="onBrand">
          {`${Math.round(item.totalCalories)} ${t('common.units.kcal')}`}
        </Text>
      </View>
    </FoodImagePreview>
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
        <Text variant="h3">{`${item.title} (${quantityDisplay})`}</Text>
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

function Macros() {
  const { item } = useHomeMealCardContext();
  const { t } = useTranslation();

  return (
    <View style={styles.macroPanel}>
      <View style={styles.macroColumn}>
        <Text variant="caption" color="secondary">
          {t('statsScreen.macros.protein')}
        </Text>
        <View style={styles.macroValueRow}>
          <Text variant="bodySmall" weight="semibold">
            {Math.round(item.proteinGrams)}
          </Text>
          <Text variant="caption" color="secondary">
            {t('common.units.gram')}
          </Text>
        </View>
      </View>
      <View style={styles.macroDivider} />
      <View style={styles.macroColumn}>
        <Text variant="caption" color="secondary">
          {t('statsScreen.macros.carbs')}
        </Text>
        <View style={styles.macroValueRow}>
          <Text variant="bodySmall" weight="semibold">
            {Math.round(item.carbsGrams)}
          </Text>
          <Text variant="caption" color="secondary">
            {t('common.units.gram')}
          </Text>
        </View>
      </View>
      <View style={styles.macroDivider} />
      <View style={styles.macroColumn}>
        <Text variant="caption" color="secondary">
          {t('statsScreen.macros.fat')}
        </Text>
        <View style={styles.macroValueRow}>
          <Text variant="bodySmall" weight="semibold">
            {Math.round(item.fatGrams)}
          </Text>
          <Text variant="caption" color="secondary">
            {t('common.units.gram')}
          </Text>
        </View>
      </View>
    </View>
  );
}

function Actions({ children }: { children: ReactNode }) {
  return <View style={styles.actionRow}>{children}</View>;
}

interface ActionButtonProps {
  icon: 'create-outline' | 'trash-outline';
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
      <Icon name={icon} size={16} variant={tone === 'danger' ? 'accent' : 'primary'} />
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
    paddingHorizontal: theme.metrics.spacing.p8,
    paddingVertical: theme.metrics.spacingV.p8,
  },
  mealMainRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: theme.metrics.spacing.p4,
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
    paddingLeft: theme.metrics.spacing.p8,
  },
  mealTitleBlock: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
  },
  favoriteButton: {
    width: theme.metrics.spacing.p32,
    height: theme.metrics.spacing.p32,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.section,
  },
  macroPanel: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: theme.metrics.borderRadius.lg,
  },
  macroColumn: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
    paddingHorizontal: theme.metrics.spacing.p8,
    paddingVertical: theme.metrics.spacingV.p4,
  },
  macroValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.metrics.spacing.p4,
  },
  macroDivider: {
    width: 1,
    marginVertical: theme.metrics.spacingV.p4,
    backgroundColor: theme.colors.border.default,
  },
  mealPreview: {
    width: theme.metrics.spacing.p88,
    minHeight: theme.metrics.spacing.p88,
    borderRadius: theme.metrics.borderRadius.lg,
    justifyContent: 'flex-end',
  },
  previewCalories: {
    alignSelf: 'center',
    paddingHorizontal: theme.metrics.spacing.p8,
    paddingVertical: theme.metrics.spacingV.p4,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.overlay.modal,
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
