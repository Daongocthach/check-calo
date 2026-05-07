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
  deleteRecentFood,
  listRecentFoodsPage,
} from '@/features/nutrition/services/nutritionDatabase';
import { useAddMealSourceSheetStore } from '@/features/nutrition/stores/useAddMealSourceSheetStore';
import { useFoodEntryRefreshStore } from '@/features/nutrition/stores/useFoodEntryRefreshStore';
import type { RecentFood } from '@/features/nutrition/types';
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

export default function RecentsTab() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const addNewFoodLabel = t('recentsScreen.addNewFoodAction');
  const appAlert = useAppAlert();
  const loadGenerationRef = useRef(0);
  const didMountRef = useRef(false);
  const previousSearchRef = useRef('');
  const [items, setItems] = useState<RecentFood[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const requestAddMealSourceSheet = useAddMealSourceSheetStore((state) => state.requestOpen);
  const recentFoodsRefreshRevision = useFoodEntryRefreshStore(
    (state) => state.recentFoodsRefreshRevision
  );

  const debouncedSearchValue = useDebouncedValue(searchValue, 250);
  const normalizedSearchValue = debouncedSearchValue.trim();

  const loadRecents = useCallback(
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

        const nextRecents = await listRecentFoodsPage(queryRequest);

        if (generation !== loadGenerationRef.current) {
          return;
        }

        setItems((currentItems) =>
          append ? [...currentItems, ...nextRecents.items] : nextRecents.items
        );
        setPage(requestedPage);
        setHasNextPage(nextRecents.hasNextPage);
      } finally {
        if (generation === loadGenerationRef.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [normalizedSearchValue]
  );

  const refreshRecents = useCallback(() => {
    setItems([]);
    setPage(1);
    setHasNextPage(false);
    void loadRecents(1, false);
  }, [loadRecents]);

  useEffect(() => {
    if (didMountRef.current) {
      refreshRecents();
      return;
    }

    didMountRef.current = true;
  }, [refreshRecents]);

  useFocusEffect(
    useCallback(() => {
      refreshRecents();
    }, [refreshRecents])
  );

  useEffect(() => {
    if (recentFoodsRefreshRevision > 0) {
      refreshRecents();
    }
  }, [recentFoodsRefreshRevision, refreshRecents]);

  useEffect(() => {
    if (previousSearchRef.current === normalizedSearchValue) {
      return;
    }

    previousSearchRef.current = normalizedSearchValue;
    refreshRecents();
  }, [normalizedSearchValue, refreshRecents]);

  const handleRemoveRecent = (recent: RecentFood) => {
    appAlert.alert(
      t('recentsScreen.removeTitle'),
      t('recentsScreen.removeMessage', { mealName: recent.name }),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: () => {
            void deleteRecentFood(recent.id).then(async () => {
              await deleteOrphanedFoodEntryAssets(recent.imageUri, recent.thumbnailUri);
              refreshRecents();
            });
          },
        },
      ]
    );
  };

  const loadMoreRecents = useCallback(() => {
    if (isLoading || isLoadingMore || !hasNextPage) {
      return;
    }

    void loadRecents(page + 1, true);
  }, [hasNextPage, isLoading, isLoadingMore, loadRecents, page]);

  const isFilteredEmpty = !isLoading && items.length === 0 && normalizedSearchValue.length > 0;
  let emptyStateContent: ReactElement | null = null;

  if (isLoading) {
    emptyStateContent = <Loading size="small" message={t('common.loading')} />;
  } else if (isFilteredEmpty) {
    emptyStateContent = (
      <EmptyState
        title={t('recentsScreen.filteredEmptyTitle')}
        message={t('recentsScreen.filteredEmptySubtitle')}
      />
    );
  } else {
    emptyStateContent = (
      <EmptyState
        title={t('recentsScreen.emptyTitle')}
        message={t('recentsScreen.emptySubtitle')}
      />
    );
  }

  return (
    <ScreenContainer padded={false} edges={[]}>
      <View style={styles.content}>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.listContent,
            {
              paddingTop: theme.metrics.spacingV.p12,
            },
          ]}
          renderItem={({ item }) => (
            <HomeMealCard.Root
              item={toHomeMealCardItem({
                ...item,
                isRecent: true,
              })}
              onPress={() =>
                router.push({
                  pathname: '/food-detail',
                  params: {
                    recentId: item.id,
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
                          recentId: item.id,
                        },
                      })
                    }
                  />
                  <HomeMealCard.ActionButton
                    icon="trash-outline"
                    label={t('common.delete')}
                    tone="danger"
                    onPress={() => {
                      handleRemoveRecent(item);
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
                  placeholder={t('recentsScreen.searchPlaceholder')}
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
          onEndReached={loadMoreRecents}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoading}>
                <Loading size="small" message={t('common.loading')} />
              </View>
            ) : null
          }
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={addNewFoodLabel}
          onPress={() => {
            requestAddMealSourceSheet({ context: 'recentFood' });
          }}
          style={styles.floatingAddButton}
        >
          <Icon name="add" variant="onBrand" size={28} />
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  content: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingBottom: theme.metrics.spacingV.p120,
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
  floatingAddButton: {
    position: 'absolute',
    bottom: theme.metrics.spacingV.p52,
    right: theme.metrics.spacing.p16,
    width: theme.metrics.spacing.p56,
    height: theme.metrics.spacing.p56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.metrics.borderRadius.full,
    backgroundColor: theme.colors.brand.primary,
    shadowColor: theme.colors.shadow.color,
    shadowOpacity: 0.28,
    shadowRadius: theme.metrics.spacing.p20,
    shadowOffset: { width: 0, height: theme.metrics.spacingV.p12 },
    elevation: theme.colors.shadow.elevationLarge + 4,
  },
}));
