import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Card, Icon, ScreenContainer, Text } from '@/common/components';
import { vs } from '@/theme/metrics';

interface FavoriteItem {
  id: string;
  title: string;
  subtitle: string;
  calories: string;
}

export default function FavoritesTab() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<'all' | 'protein' | 'lowCarb'>('all');

  const filters: Array<'all' | 'protein' | 'lowCarb'> = ['all', 'protein', 'lowCarb'];
  const items: FavoriteItem[] = [
    {
      id: 'salad',
      title: t('favoritesScreen.items.salmonSalad.title'),
      subtitle: t('favoritesScreen.items.salmonSalad.subtitle'),
      calories: '430 kcal',
    },
    {
      id: 'bowl',
      title: t('favoritesScreen.items.greenBowl.title'),
      subtitle: t('favoritesScreen.items.greenBowl.subtitle'),
      calories: '380 kcal',
    },
    {
      id: 'toast',
      title: t('favoritesScreen.items.avocadoToast.title'),
      subtitle: t('favoritesScreen.items.avocadoToast.subtitle'),
      calories: '310 kcal',
    },
  ];

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
          <Text variant="h2">18</Text>
        </Card>

        <View style={styles.filterRow}>
          {filters.map((item) => {
            const active = filter === item;
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityLabel={t(`favoritesScreen.filters.${item}`)}
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={() => setFilter(item)}
              >
                <Text variant="caption" weight="semibold" color={active ? 'primary' : 'secondary'}>
                  {t(`favoritesScreen.filters.${item}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.list}>
          {items.map((item) => (
            <Card key={item.id} variant="filled" style={styles.itemCard}>
              <View style={styles.foodThumb}>
                <Icon name="nutrition-outline" variant="secondary" size={22} />
              </View>
              <View style={styles.itemCopy}>
                <Text variant="h3">{item.title}</Text>
                <Text variant="bodySmall" color="secondary">
                  {item.subtitle}
                </Text>
                <Text variant="caption" color="accent">
                  {item.calories}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('favoritesScreen.savedItem')}
                style={styles.savedButton}
              >
                <Icon name="heart" variant="accent" size={18} />
              </Pressable>
            </Card>
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.metrics.spacing.p8,
  },
  filterPill: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingVertical: theme.metrics.spacingV.p12,
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.background.surface,
  },
  filterPillActive: {
    backgroundColor: theme.colors.brand.primary,
  },
  list: {
    gap: theme.metrics.spacingV.p12,
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
    gap: vs(2),
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
