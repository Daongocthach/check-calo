import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, SectionList, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Card, Icon, MonthSelector, ScreenContainer, SearchBar, Text } from '@/common/components';
import { HomeMealCard, toHomeMealCardItem } from '@/features/nutrition/components/HomeMealCard';
import {
  deleteFavoriteFood,
  listFavoriteFoods,
} from '@/features/nutrition/services/nutritionDatabase';
import type { FavoriteFood } from '@/features/nutrition/types';
import { useAppAlert } from '@/providers/app-alert';

interface FavoriteSection {
  title: string;
  data: FavoriteFood[];
}

function startOfDay(value: Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date): Date {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function formatSectionTitle(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export default function FavoritesTab() {
  const { t, i18n } = useTranslation();
  const appAlert = useAppAlert();
  const [items, setItems] = useState<FavoriteFood[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const loadFavorites = useCallback(async () => {
    const favorites = await listFavoriteFoods();
    setItems(favorites);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadFavorites();
    }, [loadFavorites])
  );

  const minDate = useMemo(() => {
    if (items.length === 0) {
      return undefined;
    }

    return items.reduce<Date>(
      (earliest, item) => {
        const createdAt = startOfDay(new Date(item.createdAt));
        return createdAt < earliest ? createdAt : earliest;
      },
      startOfDay(new Date(items[0].createdAt))
    );
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    const selectedStart = startOfDay(selectedDate);
    const selectedBoundary = endOfDay(selectedDate);

    return items.filter((item) => {
      const createdAt = new Date(item.createdAt);

      if (!query && createdAt > selectedBoundary) {
        return false;
      }

      if (query && (createdAt < selectedStart || createdAt > selectedBoundary)) {
        return false;
      }

      if (!query) {
        return true;
      }

      const normalizedName = item.name.toLowerCase();
      const normalizedNotes = item.notes?.toLowerCase() ?? '';

      return normalizedName.includes(query) || normalizedNotes.includes(query);
    });
  }, [items, searchValue, selectedDate]);

  const sections = useMemo<FavoriteSection[]>(() => {
    return filteredItems.reduce<FavoriteSection[]>((accumulator, item) => {
      const createdDate = startOfDay(new Date(item.createdAt));
      const sectionTitle = formatSectionTitle(createdDate, i18n.language);
      const existingSection = accumulator.find((section) => section.title === sectionTitle);

      if (existingSection) {
        existingSection.data.push(item);
        return accumulator;
      }

      accumulator.push({
        title: sectionTitle,
        data: [item],
      });

      return accumulator;
    }, []);
  }, [filteredItems, i18n.language]);

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

  const isFilteredEmpty = items.length > 0 && filteredItems.length === 0;

  return (
    <ScreenContainer padded={false} edges={['bottom']} tabBarAware>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text variant="bodySmall" weight="semibold" color="secondary">
              {section.title}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <HomeMealCard.Root
            item={toHomeMealCardItem({
              ...item,
              isFavorite: true,
            })}
            onPress={() =>
              router.push({
                pathname: '/food-form',
                params: {
                  favoriteId: item.id,
                },
              })
            }
          >
            <HomeMealCard.Preview />
            <HomeMealCard.Content>
              <HomeMealCard.Header>
                <HomeMealCard.ActionButton
                  icon="create-outline"
                  label={t('common.edit')}
                  onPress={() =>
                    router.push({
                      pathname: '/food-form',
                      params: {
                        favoriteId: item.id,
                      },
                    })
                  }
                />
                <HomeMealCard.ActionButton
                  icon="trash-outline"
                  label={t('common.delete')}
                  tone="danger"
                  onPress={() => {
                    handleRemoveFavorite(item);
                  }}
                />
              </HomeMealCard.Header>
              <HomeMealCard.Macros />
            </HomeMealCard.Content>
          </HomeMealCard.Root>
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Card variant="elevated" style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <Icon name="library" variant="primary" size={20} />
              </View>
              <View style={styles.heroCopy}>
                <Text variant="h3">
                  {t('favoritesScreen.heroTitleWithCount', { count: filteredItems.length })}
                </Text>
                <Text variant="bodySmall" color="secondary">
                  {t('favoritesScreen.heroSubtitle')}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('favoritesScreen.addFavoriteAction')}
                style={styles.addButton}
                onPress={() =>
                  router.push({
                    pathname: '/food-form',
                  })
                }
              >
                <Icon name="add" variant="primary" size={18} />
              </Pressable>
            </Card>

            <View style={styles.controls}>
              <MonthSelector
                selectedDate={selectedDate}
                onChange={setSelectedDate}
                minDate={minDate}
                maxDate={new Date()}
              />

              <SearchBar
                value={searchValue}
                onChangeText={setSearchValue}
                placeholder={t('favoritesScreen.searchPlaceholder')}
              />

              <Text variant="caption" color="secondary">
                {t('favoritesScreen.filterHint')}
              </Text>
            </View>

            {items.length === 0 ? (
              <Card variant="filled" style={styles.emptyCard}>
                <Text variant="h3">{t('favoritesScreen.emptyTitle')}</Text>
                <Text variant="bodySmall" color="secondary">
                  {t('favoritesScreen.emptySubtitle')}
                </Text>
              </Card>
            ) : null}

            {isFilteredEmpty ? (
              <Card variant="filled" style={styles.emptyCard}>
                <Text variant="h3">{t('favoritesScreen.filteredEmptyTitle')}</Text>
                <Text variant="bodySmall" color="secondary">
                  {t('favoritesScreen.filteredEmptySubtitle')}
                </Text>
              </Card>
            ) : null}
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  listContent: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p12,
    paddingBottom: theme.metrics.spacingV.p24,
    gap: theme.metrics.spacingV.p12,
  },
  header: {
    gap: theme.metrics.spacingV.p16,
    paddingBottom: theme.metrics.spacingV.p4,
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
    backgroundColor: theme.colors.brand.primaryVariant,
  },
  heroCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  addButton: {
    width: theme.metrics.spacing.p40,
    height: theme.metrics.spacing.p40,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.brand.primary,
    borderWidth: 1,
    borderColor: theme.colors.brand.primary,
  },
  controls: {
    gap: theme.metrics.spacingV.p12,
  },
  sectionHeader: {
    paddingTop: theme.metrics.spacingV.p4,
    paddingBottom: theme.metrics.spacingV.p8,
  },
  emptyCard: {
    gap: theme.metrics.spacingV.p8,
  },
}));
