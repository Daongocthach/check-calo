import { BottomSheetBackdrop, BottomSheetFlatList, BottomSheetModal } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { useCallback, useMemo, useRef } from 'react';
import { Keyboard, Pressable, View } from 'react-native';
import type { ListRenderItem } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/common/components/Icon';
import { SearchBar } from '@/common/components/SearchBar';
import { Text } from '@/common/components/Text';
import { UniActivityIndicator } from '@/common/components/uni';
import { styles } from './Select.styles';
import type { SelectOption, SelectProps } from './Select.types';

/**
 * A select dropdown using a bottom sheet modal to display options.
 *
 * @example
 * ```tsx
 * <Select
 *   value={country}
 *   onChange={setCountry}
 *   options={[
 *     { label: 'Egypt', value: 'eg' },
 *     { label: 'USA', value: 'us' },
 *   ]}
 *   placeholder="Choose a country"
 *   label="Country"
 * />
 * ```
 */
export function Select({
  value,
  onChange,
  options,
  onEndReached,
  hasMore = false,
  isLoadingMore = false,
  searchValue,
  onSearchChangeText,
  searchPlaceholder,
  isSearching = false,
  emptyText,
  placeholder,
  label,
  error,
  disabled = false,
  readOnly = false,
  size = 'md',
  snapPoints,
  children,
  triggerVariant,
}: SelectProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const resolvedSnapPoints = useMemo(() => snapPoints ?? ['50%', '70%'], [snapPoints]);
  const insets = useSafeAreaInsets();
  const isInteractionDisabled = disabled || readOnly;

  styles.useVariants({ size, error: !!error, disabled, triggerVariant });

  const selectedOption = options.find((o) => o.value === value);
  const displayText = selectedOption?.label ?? placeholder ?? '';
  const shouldShowSearch = typeof onSearchChangeText === 'function';

  const handleOpen = useCallback(() => {
    if (!isInteractionDisabled) {
      Keyboard.dismiss();
      bottomSheetRef.current?.present();
    }
  }, [isInteractionDisabled]);

  const handleSelect = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      bottomSheetRef.current?.dismiss();
    },
    [onChange]
  );

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

  const renderItem: ListRenderItem<SelectOption> = useCallback(
    ({ item }) => {
      const isSelected = item.value === value;

      return (
        <Pressable
          onPress={() => handleSelect(item.value)}
          disabled={item.disabled || readOnly}
          style={[styles.option, isSelected && styles.optionSelected]}
          accessibilityRole="radio"
          accessibilityState={{
            selected: isSelected,
            disabled: item.disabled || readOnly,
          }}
        >
          <View style={styles.optionContent}>
            {item.iconSource ? (
              <Image source={item.iconSource} style={styles.optionIcon} contentFit="contain" />
            ) : null}
            <Text
              variant="body"
              style={[styles.optionText, isSelected && styles.optionTextSelected]}
            >
              {item.label}
            </Text>
          </View>
          {isSelected ? <Icon name="checkmark" sizeVariant="lg" variant="primary" /> : null}
        </Pressable>
      );
    },
    [handleSelect, readOnly, value]
  );

  const handleEndReached = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      onEndReached?.();
    }
  }, [hasMore, isLoadingMore, onEndReached]);

  const renderFooter = useCallback(() => {
    return (
      <View style={styles.footerContainer}>
        {isLoadingMore ? (
          <View style={styles.footerLoader}>
            <UniActivityIndicator
              size="small"
              uniProps={(theme) => ({
                color: theme.colors.brand.primary,
              })}
            />
          </View>
        ) : null}
        <View style={[styles.footerSafeArea, { paddingBottom: insets.bottom }]} />
      </View>
    );
  }, [insets.bottom, isLoadingMore]);

  const renderEmpty = useCallback(() => {
    if (!emptyText || isSearching) {
      return null;
    }

    return (
      <View style={styles.emptyContainer}>
        <Text variant="body" style={styles.emptyText}>
          {emptyText}
        </Text>
      </View>
    );
  }, [emptyText, isSearching]);

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text variant="label" style={styles.label}>
          {label}
        </Text>
      )}
      <Pressable
        onPress={handleOpen}
        disabled={isInteractionDisabled}
        accessibilityRole="combobox"
        accessibilityState={{ expanded: false, disabled: isInteractionDisabled }}
        style={styles.trigger}
      >
        {children ?? (
          <>
            <View style={styles.triggerContent}>
              {selectedOption?.iconSource ? (
                <Image
                  source={selectedOption.iconSource}
                  style={styles.optionIcon}
                  contentFit="contain"
                />
              ) : null}
              <Text
                variant="body"
                numberOfLines={1}
                ellipsizeMode="tail"
                style={selectedOption ? styles.selectedText : styles.placeholderText}
              >
                {displayText}
              </Text>
            </View>
            <Icon name="chevron-down" sizeVariant="md" variant="muted" />
          </>
        )}
      </Pressable>
      {error && (
        <Text variant="caption" style={styles.errorText}>
          {error}
        </Text>
      )}
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={resolvedSnapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        topInset={insets.top}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
      >
        {shouldShowSearch ? (
          <View style={styles.searchContainer}>
            <SearchBar
              value={searchValue ?? ''}
              onChangeText={onSearchChangeText}
              placeholder={searchPlaceholder}
              loading={isSearching}
            />
          </View>
        ) : null}
        <BottomSheetFlatList
          data={options}
          keyExtractor={(item: SelectOption) => item.value}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            shouldShowSearch && styles.listContentWithSearch,
          ]}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          keyboardShouldPersistTaps="handled"
        />
      </BottomSheetModal>
    </View>
  );
}
