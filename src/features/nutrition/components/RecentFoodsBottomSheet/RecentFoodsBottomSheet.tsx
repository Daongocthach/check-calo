import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Card, Icon, Loading, SearchBar, Text } from '@/common/components';
import type { RecentFood } from '@/features/nutrition/types';
import { styles } from './RecentFoodsBottomSheet.styles';
import type { RecentFoodsBottomSheetProps } from './RecentFoodsBottomSheet.types';

export function RecentFoodsBottomSheet({
  bottomSheetRef,
  recentFoods,
  title,
  subtitle,
  searchPlaceholder,
  emptyTitle,
  emptySubtitle,
  closeAccessibilityLabel,
  renderRecentItem,
  rightActions,
  topInset,
  onDismiss,
  snapPoints = ['65%', '88%'],
  hasNextPage = false,
  isLoadingMore = false,
  onLoadMore,
}: RecentFoodsBottomSheetProps) {
  const [searchValue, setSearchValue] = useState('');

  const filteredRecents = useMemo(() => {
    const normalizedQuery = searchValue.trim().toLowerCase();

    if (!normalizedQuery) {
      return recentFoods;
    }

    return recentFoods.filter((recent) => recent.name.toLowerCase().includes(normalizedQuery));
  }, [recentFoods, searchValue]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleEndReached = useCallback(() => {
    if (!hasNextPage || isLoadingMore) {
      return;
    }

    onLoadMore?.();
  }, [hasNextPage, isLoadingMore, onLoadMore]);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      topInset={topInset}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.sheetHandle}
      onDismiss={() => {
        setSearchValue('');
        onDismiss?.();
      }}
    >
      <View style={styles.sheetContent}>
        <View style={styles.sheetHeader}>
          <View style={styles.headerCopy}>
            <Text variant="body" weight="bold">
              {title}
            </Text>
            <Text variant="bodySmall" color="secondary">
              {subtitle}
            </Text>
          </View>
          <View style={styles.sheetHeaderActions}>
            {rightActions}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={closeAccessibilityLabel}
              style={styles.sheetCloseButton}
              onPress={() => bottomSheetRef.current?.dismiss()}
            >
              <Icon name="close" variant="muted" size={18} />
            </Pressable>
          </View>
        </View>

        <SearchBar
          value={searchValue}
          onChangeText={setSearchValue}
          placeholder={searchPlaceholder}
        />

        <BottomSheetFlatList<RecentFood>
          data={filteredRecents}
          keyExtractor={(item: RecentFood) => item.id}
          contentContainerStyle={styles.sheetList}
          keyboardShouldPersistTaps="handled"
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <Card variant="filled" style={styles.sheetEmptyCard}>
              <Text variant="body" weight="semibold" align="center">
                {emptyTitle}
              </Text>
              <Text variant="bodySmall" color="secondary" align="center">
                {emptySubtitle}
              </Text>
            </Card>
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.sheetFooter}>
                <Loading size="small" />
              </View>
            ) : null
          }
          renderItem={({ item }: { item: RecentFood }) => renderRecentItem(item)}
        />
      </View>
    </BottomSheetModal>
  );
}
