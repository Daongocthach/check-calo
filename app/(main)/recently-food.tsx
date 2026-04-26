import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { EmptyState, Icon, Loading, ScreenContainer, SearchBar, Text } from '@/common/components';
import { HomeMealCard, toHomeMealCardItem } from '@/features/nutrition/components/HomeMealCard';
import { deleteOrphanedFoodEntryAssets } from '@/features/nutrition/services/foodEntryImageSync';
import {
  deleteFavoriteFood,
  listFavoriteFoodsPage,
} from '@/features/nutrition/services/nutritionDatabase';
import type { FavoriteFood } from '@/features/nutrition/types';
import { useAppAlert } from '@/providers/app-alert';

const RECENTLY_FOOD_PAGE_SIZE = 20;

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [delayMs, value]);

  return debouncedValue;
}

export default function FavoritesTab() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const appAlert = useAppAlert();
  const loadGenerationRef = useRef(0);
  const didMountRef = useRef(false);
  const previousSearchRef = useRef('');
  const [items, setItems] = useState<FavoriteFood[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const debouncedSearchValue = useDebouncedValue(searchValue, 250);
  const normalizedSearchValue = debouncedSearchValue.trim();

  const loadFavorites = useCallback(
    async (requestedPage: number, append: boolean) => {
      const generation = ++loadGenerationRef.current;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      try {
        const queryRequest = {
          page: requestedPage,
          pageSize: RECENTLY_FOOD_PAGE_SIZE,
          searchQuery: normalizedSearchValue.length > 0 ? normalizedSearchValue : undefined,
        };

        const nextFavorites = await listFavoriteFoodsPage(queryRequest);

        if (generation !== loadGenerationRef.current) {
          return;
        }

        setItems((currentItems) =>
          append ? [...currentItems, ...nextFavorites.items] : nextFavorites.items
        );
        setPage(requestedPage);
        setHasNextPage(nextFavorites.hasNextPage);
      } finally {
        if (generation === loadGenerationRef.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [normalizedSearchValue]
  );

  const refreshFavorites = useCallback(() => {
    setItems([]);
    setPage(1);
    setHasNextPage(false);
    void loadFavorites(1, false);
  }, [loadFavorites]);

  useEffect(() => {
    if (didMountRef.current) {
      refreshFavorites();
      return;
    }

    didMountRef.current = true;
  }, [refreshFavorites]);

  useFocusEffect(
    useCallback(() => {
      refreshFavorites();
    }, [refreshFavorites])
  );

  useEffect(() => {
    if (previousSearchRef.current === normalizedSearchValue) {
      return;
    }

    previousSearchRef.current = normalizedSearchValue;
    refreshFavorites();
  }, [normalizedSearchValue, refreshFavorites]);

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
            void deleteFavoriteFood(favorite.id).then(async () => {
              await deleteOrphanedFoodEntryAssets(favorite.imageUri, favorite.thumbnailUri);
              refreshFavorites();
            });
          },
        },
      ]
    );
  };

  const loadMoreFavorites = useCallback(() => {
    if (isLoading || isLoadingMore || !hasNextPage) {
      return;
    }

    void loadFavorites(page + 1, true);
  }, [hasNextPage, isLoading, isLoadingMore, loadFavorites, page]);

  const isFilteredEmpty = !isLoading && items.length === 0 && normalizedSearchValue.length > 0;
  let emptyStateContent: ReactElement | null = null;

  if (isLoading) {
    emptyStateContent = <Loading size="small" message={t('common.loading')} />;
  } else if (isFilteredEmpty) {
    emptyStateContent = (
      <EmptyState
        title={t('favoritesScreen.filteredEmptyTitle')}
        message={t('favoritesScreen.filteredEmptySubtitle')}
      />
    );
  } else {
    emptyStateContent = (
      <EmptyState
        title={t('favoritesScreen.emptyTitle')}
        message={t('favoritesScreen.emptySubtitle')}
      />
    );
  }

  return (
    <ScreenContainer padded={false} edges={['bottom']} tabBarAware>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.listContent, { paddingTop: theme.metrics.spacingV.p12 }]}
        renderItem={({ item }) => (
          <HomeMealCard.Root
            item={toHomeMealCardItem({
              ...item,
              isFavorite: true,
            })}
            onPress={() =>
              router.push({
                pathname: '/food-detail',
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
            {isSearchOpen ? (
              <SearchBar
                value={searchValue}
                onChangeText={setSearchValue}
                placeholder={t('favoritesScreen.searchPlaceholder')}
                autoFocus
              />
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.search')}
                onPress={() => setIsSearchOpen(true)}
                style={styles.searchButton}
              >
                <Icon name="search" variant="primary" size={18} />
                <Text variant="bodySmall" weight="semibold">
                  {t('common.search')}
                </Text>
              </Pressable>
            )}
          </View>
        }
        ListEmptyComponent={emptyStateContent}
        onEndReached={loadMoreFavorites}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoading}>
              <Loading size="small" message={t('common.loading')} />
            </View>
          ) : null
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  listContent: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingBottom: theme.metrics.spacingV.p24,
    gap: theme.metrics.spacingV.p12,
  },
  header: {
    marginBottom: theme.metrics.spacingV.p4,
  },
  searchButton: {
    minHeight: theme.metrics.spacing.p44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.metrics.spacing.p8,
    paddingHorizontal: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    backgroundColor: theme.colors.background.surface,
  },
  footerLoading: {
    paddingVertical: theme.metrics.spacingV.p16,
  },
}));
