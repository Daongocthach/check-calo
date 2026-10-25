import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Button, Icon, Text } from '@/common/components';
import type { ChatFoodItem } from '../../services/foodAnalyzer';

export interface FoodResultCardProps {
  items: ChatFoodItem[];
  imageUri: string | null;
  isSuggestion: boolean;
  isLogged: boolean;
  isSaving: boolean;
  onLog: () => void;
}

function sum(
  items: ChatFoodItem[],
  key: keyof Pick<ChatFoodItem, 'calories' | 'proteinGrams' | 'carbsGrams' | 'fatGrams'>
) {
  return Math.round(items.reduce((total, item) => total + item[key], 0));
}

/** AI result: list of detected/suggested foods with totals and an "add to diary" button. */
export function FoodResultCard({
  items,
  imageUri,
  isSuggestion,
  isLogged,
  isSaving,
  onLog,
}: FoodResultCardProps) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const totals = [
    { key: 'protein', value: sum(items, 'proteinGrams') },
    { key: 'carbs', value: sum(items, 'carbsGrams') },
    { key: 'fat', value: sum(items, 'fatGrams') },
  ] as const;

  return (
    <View style={styles.card}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} contentFit="cover" />
      ) : null}
      <View style={styles.body}>
        {items.map((item) => (
          <View key={`${item.name}-${item.calories}`} style={styles.itemRow}>
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
          </View>
        ))}
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
        {isLogged ? (
          <View style={styles.logged}>
            <Icon name="checkmark-circle" size={18} color={theme.colors.brand.primary} />
            <Text variant="bodySmall" weight="semibold">
              {t('chat.logged')}
            </Text>
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
    padding: theme.metrics.spacing.p12,
    gap: theme.metrics.spacingV.p12,
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
  logged: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.metrics.spacing.p8,
    paddingVertical: theme.metrics.spacingV.p8,
  },
}));
