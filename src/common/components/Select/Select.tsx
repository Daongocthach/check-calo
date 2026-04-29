import { Image } from 'expo-image';
import { useCallback, useMemo, useRef } from 'react';
import { FlatList, Keyboard, Pressable, View } from 'react-native';
import type { ListRenderItem } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/common/components/Icon';
import { SearchBar } from '@/common/components/SearchBar';
import { Text } from '@/common/components/Text';
import { UniActivityIndicator } from '@/common/components/uni';
import { useAppBottomSheet } from '@/providers/bottom-sheet';
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
  const { openSheet, closeSheet } = useAppBottomSheet();
  const pendingValueRef = useRef<string | null>(null);
  const resolvedSnapPoints = useMemo(() => snapPoints ?? ['50%', '70%'], [snapPoints]);
  const insets = useSafeAreaInsets();
  const isInteractionDisabled = disabled || readOnly;

  styles.useVariants({ size, error: !!error, disabled, triggerVariant });

  const selectedOption = options.find((o) => o.value === value);
  const displayText = selectedOption?.label ?? placeholder ?? '';
  const shouldShowSearch = typeof onSearchChangeText === 'function';

  const handleSelect = useCallback(
    (optionValue: string) => {
      pendingValueRef.current = optionValue;
      closeSheet();
    },
    [closeSheet]
  );

  const handleDismiss = useCallback(() => {
    const optionValue = pendingValueRef.current;
    pendingValueRef.current = null;

    if (optionValue) {
      onChange(optionValue);
    }
  }, [onChange]);

  const renderItem: ListRenderItem<SelectOption> = useCallback(
    ({ item }) => {
      const isSelected = item.value === value;
      let leadingIcon = null;

      if (item.iconSource) {
        leadingIcon = (
          <Image source={item.iconSource} style={styles.optionIcon} contentFit="contain" />
        );
      } else if (item.iconName) {
        leadingIcon = (
          <Icon
            name={item.iconName}
            size={20}
            destructive={item.destructive}
            variant={item.destructive ? 'secondary' : 'primary'}
          />
        );
      }

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
            {leadingIcon}
            <Text
              variant="body"
              style={[
                styles.optionText,
                isSelected && styles.optionTextSelected,
                item.destructive && styles.optionTextDestructive,
              ]}
            >
              {item.label}
            </Text>
          </View>
          {isSelected ? (
            <Icon
              name="checkmark"
              sizeVariant="lg"
              destructive={item.destructive}
              variant={item.destructive ? 'secondary' : 'primary'}
            />
          ) : null}
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

  let triggerIcon = null;

  if (selectedOption?.iconSource) {
    triggerIcon = (
      <Image source={selectedOption.iconSource} style={styles.optionIcon} contentFit="contain" />
    );
  } else if (selectedOption?.iconName) {
    triggerIcon = (
      <Icon
        name={selectedOption.iconName}
        size={20}
        destructive={selectedOption.destructive}
        variant={selectedOption.destructive ? 'secondary' : 'primary'}
      />
    );
  }

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

  const sheetContent = useMemo(
    () => (
      <View style={styles.providerContent}>
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
        <FlatList
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
      </View>
    ),
    [
      handleEndReached,
      isSearching,
      onSearchChangeText,
      options,
      renderEmpty,
      renderFooter,
      renderItem,
      searchPlaceholder,
      searchValue,
      shouldShowSearch,
    ]
  );

  const handleOpen = useCallback(() => {
    if (!isInteractionDisabled) {
      Keyboard.dismiss();
      openSheet(sheetContent, {
        snapPoints: resolvedSnapPoints,
        containerVariant: 'none',
        enablePanDownToClose: true,
        onDismiss: handleDismiss,
      });
    }
  }, [handleDismiss, isInteractionDisabled, openSheet, resolvedSnapPoints, sheetContent]);

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
              {triggerIcon}
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
    </View>
  );
}
