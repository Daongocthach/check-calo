import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Card, Icon, ScreenContainer, Text } from '@/common/components';
import {
  deleteFavoriteFood,
  listFavoriteFoods,
} from '@/features/nutrition/services/nutritionDatabase';
import type { FavoriteFood } from '@/features/nutrition/types';
import { useAppAlert } from '@/providers/app-alert';
import { vs } from '@/theme/metrics';

export default function FavoritesTab() {
  const { t } = useTranslation();
  const appAlert = useAppAlert();
  const [items, setItems] = useState<FavoriteFood[]>([]);

  const loadFavorites = useCallback(async () => {
    const favorites = await listFavoriteFoods();
    setItems(favorites);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadFavorites();
    }, [loadFavorites])
  );

  const handleRemoveFavorite = (favorite: FavoriteFood) => {
    appAlert.alert(
      t('favoritesScreen.removeTitle'),
      t('favoritesScreen.removeMessage', { mealName: favorite.name }),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: () => {
            void deleteFavoriteFood(favorite.id).then(() => {
              void loadFavorites();
            });
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer scrollable padded edges={['bottom']} tabBarAware>
      <View style={styles.screen}>
        <Card variant="elevated" style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Icon name="heart" variant="inverse" size={20} />
          </View>
          <View style={styles.heroCopy}>
            <Text variant="h3">{t('favoritesScreen.heroTitle')}</Text>
            <Text variant="bodySmall" color="secondary">
              {t('favoritesScreen.heroSubtitle')}
            </Text>
          </View>
          <Text variant="h2">{items.length}</Text>
        </Card>

        <View style={styles.list}>
          {items.length === 0 ? (
            <Card variant="filled" style={styles.emptyCard}>
              <Text variant="h3">{t('favoritesScreen.emptyTitle')}</Text>
              <Text variant="bodySmall" color="secondary">
                {t('favoritesScreen.emptySubtitle')}
              </Text>
            </Card>
          ) : null}

          {items.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={item.name}
              onPress={() =>
                router.push({
                  pathname: '/food-result',
                  params: {
                    mode: 'manual',
                    title: item.name,
                    subtitle: item.quantityLabel,
                    calories: `${Math.round(item.totalCalories)} kcal`,
                    protein: `${Math.round(item.proteinGrams)} g`,
                    carbs: `${Math.round(item.carbsGrams)} g`,
                    fat: `${Math.round(item.fatGrams)} g`,
                  },
                })
              }
            >
              <Card variant="filled" style={styles.itemCard}>
                <View style={styles.foodThumb}>
                  <Icon name="nutrition-outline" variant="secondary" size={22} />
                </View>
                <View style={styles.itemCopy}>
                  <Text variant="h3">{item.name}</Text>
                  <Text variant="bodySmall" color="secondary">
                    {item.quantityLabel}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text variant="caption" color="accent">
                      {`${Math.round(item.totalCalories)} ${t('common.units.kcal')}`}
                    </Text>
                    <Text variant="caption" color="secondary">
                      {`${Math.round(item.proteinGrams)}P • ${Math.round(item.carbsGrams)}C • ${Math.round(item.fatGrams)}F`}
                    </Text>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('favoritesScreen.savedItem')}
                  style={styles.savedButton}
                  onPress={(event) => {
                    event.stopPropagation();
                    handleRemoveFavorite(item);
                  }}
                >
                  <Icon name="heart" variant="accent" size={18} />
                </Pressable>
              </Card>
            </Pressable>
          ))}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    gap: theme.metrics.spacingV.p20,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    backgroundColor: theme.colors.background.section,
  },
  heroIcon: {
    width: theme.metrics.spacing.p44,
    height: theme.metrics.spacing.p44,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.brand.secondary,
  },
  heroCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  list: {
    gap: theme.metrics.spacingV.p12,
  },
  emptyCard: {
    gap: theme.metrics.spacingV.p8,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
  },
  foodThumb: {
    width: theme.metrics.spacing.p52,
    height: theme.metrics.spacing.p52,
    borderRadius: theme.metrics.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.surfaceAlt,
  },
  itemCopy: {
    flex: 1,
    gap: vs(4),
  },
  metaRow: {
    gap: theme.metrics.spacingV.p4,
  },
  savedButton: {
    width: theme.metrics.spacing.p36,
    height: theme.metrics.spacing.p36,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.section,
  },
}));
