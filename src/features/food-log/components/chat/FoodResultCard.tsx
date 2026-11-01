import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Accordion, Button, Chip, Icon, IconButton, Text } from '@/common/components';
import type { ChatFoodItem } from '../../services/foodAnalyzer';
import { CHAT_ITEM_SCALES } from '../../utils/chatItems';
import type { MealPortion } from '../../utils/mealImpact';
import { pickNutrients, sumNutrients } from '../../utils/nutrients';
import { MealEditForm, type MealEditValues } from '../meal/MealEditForm';
import { NutrientList } from '../NutrientList';

export interface FoodResultCardProps {
  items: ChatFoodItem[];
  imageUri: string | null;
  isSuggestion: boolean;
  isLogged: boolean;
  /** The smaller portion the card was saved as, if any. */
  loggedPortion?: MealPortion | null;
  /** What the meal does to the rest of the day, shown above the add button. */
  impact?: ReactNode;
  /** Quantity scale picked for each item (see `CHAT_ITEM_SCALES`). */
  scales?: number[];
  /** A save or undo for this card is in progress. */
  isSaving: boolean;
  onLog: () => void;
  onUndo: () => void;
  /** Editing is offered until the card is saved, when these are given. */
  onEditItem?: (index: number, item: ChatFoodItem) => void;
  onRemoveItem?: (index: number) => void;
  onScaleItem?: (index: number, factor: number) => void;
}

function toEditValues(item: ChatFoodItem): MealEditValues {
  return { ...pickNutrients(item), ...item, notes: null };
}

function fromEditValues(item: ChatFoodItem, values: MealEditValues): ChatFoodItem {
  return {
    ...item,
    ...pickNutrients(values),
    name: values.name,
    quantityLabel: values.quantityLabel,
    // A new quantity makes the estimated weight meaningless.
    quantityGrams: values.quantityLabel === item.quantityLabel ? item.quantityGrams : null,
    calories: values.calories,
    proteinGrams: values.proteinGrams,
    carbsGrams: values.carbsGrams,
    fatGrams: values.fatGrams,
  };
}

function sum(
  items: ChatFoodItem[],
  key: keyof Pick<ChatFoodItem, 'calories' | 'proteinGrams' | 'carbsGrams' | 'fatGrams'>
) {
  return Math.round(items.reduce((total, item) => total + item[key], 0));
}

/**
 * AI result: detected/suggested foods with macro totals, the other nutrients folded into an
 * accordion, and an "add to diary" button that turns into an undo once saved.
 */
export function FoodResultCard({
  items,
  imageUri,
  isSuggestion,
  isLogged,
  loggedPortion = null,
  impact = null,
  scales,
  isSaving,
  onLog,
  onUndo,
  onEditItem,
  onRemoveItem,
  onScaleItem,
}: FoodResultCardProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const isEditable = !isLogged && !isSaving;
  const editingItem = editingIndex === null ? undefined : items[editingIndex];

  if (editingIndex !== null && editingItem && onEditItem) {
    return (
      <View style={[styles.card, styles.body]}>
        <MealEditForm
          values={toEditValues(editingItem)}
          showNotes={false}
          onRemove={
            items.length > 1 && onRemoveItem
              ? () => {
                  onRemoveItem(editingIndex);
                  setEditingIndex(null);
                }
              : undefined
          }
          onCancel={() => setEditingIndex(null)}
          onSubmit={(values) => {
            onEditItem(editingIndex, fromEditValues(editingItem, values));
            setEditingIndex(null);
          }}
        />
      </View>
    );
  }

  const totals = [
    { key: 'protein', value: sum(items, 'proteinGrams') },
    { key: 'carbs', value: sum(items, 'carbsGrams') },
    { key: 'fat', value: sum(items, 'fatGrams') },
  ] as const;
  const nutrientTotals = sumNutrients(items);
  const hasNutrients = Object.values(nutrientTotals).some((value) => value !== null);

  return (
    <View style={styles.card}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} contentFit="cover" />
      ) : null}
      <View style={styles.body}>
        {items.map((item, index) => (
          // Index keys: scaling or editing changes every field of an item.
          <View key={index} style={styles.item}>
            <View style={styles.itemRow}>
              <View style={styles.itemText}>
                <Text variant="body" weight="semibold" numberOfLines={2}>
                  {item.name}
                </Text>
                {item.quantityLabel ? (
                  <Text variant="caption" color="secondary">
                    {item.quantityLabel}
                  </Text>
                ) : null}
              </View>
              <Text variant="body" weight="bold">
                {item.calories}
                <Text variant="caption" color="tertiary">
                  {` ${t('common.units.kcal')}`}
                </Text>
              </Text>
              {isEditable && onEditItem ? (
                <IconButton
                  icon="create-outline"
                  size="sm"
                  variant="ghost"
                  onPress={() => setEditingIndex(index)}
                  accessibilityLabel={t('chat.editFood', { name: item.name })}
                />
              ) : null}
            </View>
            {isEditable && onScaleItem ? (
              <View style={styles.scales}>
                {CHAT_ITEM_SCALES.map((scale) => (
                  <Chip
                    key={scale.factor}
                    size="sm"
                    text={`×${scale.symbol}`}
                    selected={(scales?.[index] ?? 1) === scale.factor}
                    onPress={() => onScaleItem(index, scale.factor)}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ))}
        {items.length > 1 ? (
          <View style={[styles.itemRow, styles.totalRow]}>
            <Text variant="bodySmall" color="secondary" style={styles.itemText}>
              {t('chat.total')}
            </Text>
            <Text variant="body" weight="bold">
              {sum(items, 'calories')}
              <Text variant="caption" color="tertiary">
                {` ${t('common.units.kcal')}`}
              </Text>
            </Text>
          </View>
        ) : null}
        <View style={styles.totals}>
          {totals.map((total) => (
            <View key={total.key} style={styles.totalItem}>
              <Text variant="body" weight="bold">
                {`${total.value}${t('common.units.gram')}`}
              </Text>
              <Text variant="caption" color="secondary">
                {t(`macros.${total.key}`)}
              </Text>
            </View>
          ))}
        </View>
      </View>
      {hasNutrients ? (
        <View style={styles.nutrients}>
          <Accordion
            items={[
              {
                id: 'nutrients',
                title: t('nutrients.title'),
                content: <NutrientList values={nutrientTotals} />,
              },
            ]}
          />
        </View>
      ) : null}
      {impact ? (
        <View style={[styles.impact, hasNutrients && styles.impactUnderNutrients]}>{impact}</View>
      ) : null}
      <View style={[styles.footer, !hasNutrients && !impact && styles.footerFlush]}>
        {isLogged ? (
          <View style={styles.logged}>
            <Icon name="checkmark-circle" size={20} color={theme.colors.brand.primary} />
            <Text variant="bodySmall" weight="semibold" style={styles.loggedText}>
              {loggedPortion ? t(`chat.loggedPortion.${loggedPortion}`) : t('chat.logged')}
            </Text>
            <Button
              title={t('chat.undo')}
              variant="ghost"
              size="sm"
              leftIcon={<Icon name="arrow-undo" variant="brand" size={16} />}
              loading={isSaving}
              onPress={onUndo}
            />
          </View>
        ) : (
          <Button
            title={
              isSuggestion ? t('chat.addSuggestion') : t('chat.addToDiary', { count: items.length })
            }
            leftIcon={<Icon name="add" variant="onBrand" size={18} />}
            loading={isSaving}
            onPress={onLog}
            fullWidth
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    alignSelf: 'stretch',
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  image: {
    width: '100%',
    aspectRatio: 1.8,
  },
  body: {
    padding: theme.metrics.spacing.p16,
    gap: theme.metrics.spacingV.p12,
  },
  item: {
    gap: theme.metrics.spacingV.p8,
  },
  scales: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
  },
  itemText: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  totalRow: {
    paddingTop: theme.metrics.spacingV.p12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.subtle,
  },
  totals: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p8,
  },
  totalItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.metrics.spacingV.p8,
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor: theme.colors.background.surfaceAlt,
    gap: theme.metrics.spacingV.p4,
  },
  nutrients: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  impact: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
  impactUnderNutrients: {
    borderTopWidth: 0,
  },
  footer: {
    padding: theme.metrics.spacing.p16,
  },
  footerFlush: {
    paddingTop: 0,
  },
  logged: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
  },
  loggedText: {
    flex: 1,
  },
}));
