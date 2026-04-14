import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Card, Icon, SearchBar, Text } from '@/common/components';
import type { FavoriteFood } from '@/features/nutrition/types';
import { styles } from './FavoriteFoodsBottomSheet.styles';
import type { FavoriteFoodsBottomSheetProps } from './FavoriteFoodsBottomSheet.types';

export function FavoriteFoodsBottomSheet({
  bottomSheetRef,
  favoriteFoods,
  title,
  subtitle,
  searchPlaceholder,
  emptyTitle,
  emptySubtitle,
  closeAccessibilityLabel,
  renderFavoriteItem,
  rightActions,
  topInset,
  onDismiss,
  snapPoints = ['65%', '88%'],
}: FavoriteFoodsBottomSheetProps) {
  const [searchValue, setSearchValue] = useState('');

  const filteredFavorites = useMemo(() => {
    const normalizedQuery = searchValue.trim().toLowerCase();

    if (!normalizedQuery) {
      return favoriteFoods;
    }

    return favoriteFoods.filter((favorite) =>
      favorite.name.toLowerCase().includes(normalizedQuery)
    );
  }, [favoriteFoods, searchValue]);

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
            <Text variant="h3">{title}</Text>
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

        <BottomSheetFlatList<FavoriteFood>
          data={filteredFavorites}
          keyExtractor={(item: FavoriteFood) => item.id}
          contentContainerStyle={styles.sheetList}
          keyboardShouldPersistTaps="handled"
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
          renderItem={({ item }: { item: FavoriteFood }) => renderFavoriteItem(item)}
        />
      </View>
    </BottomSheetModal>
  );
}
