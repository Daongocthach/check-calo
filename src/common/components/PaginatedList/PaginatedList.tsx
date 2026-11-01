import { FlashList, type FlashListRef } from '@shopify/flash-list';
import {
  forwardRef,
  isValidElement,
  useCallback,
  useRef,
  useState,
  type ComponentType,
  type ForwardedRef,
  type ReactElement,
} from 'react';
import { useTranslation } from 'react-i18next';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { View } from 'react-native';
import { useKeyboardState } from 'react-native-keyboard-controller';
import { EmptyState } from '@/common/components/EmptyState';
import { IconButton } from '@/common/components/IconButton';
import { Loading } from '@/common/components/Loading';
import { AppRefreshControl } from '@/common/components/RefreshControl';
import { useBottomPadding } from '@/hooks';
import { styles } from './PaginatedList.styles';
import type { PaginatedListProps, PaginatedListRef } from './PaginatedList.types';

export const PaginatedList = forwardRef(
  <T,>(
    {
      data,
      keyExtractor,
      renderItem,
      numColumns,
      automaticContentPadding = true,
      keyboardDismissMode = 'on-drag',
      loading = false,
      refreshing = false,
      onRefresh,
      hasNextPage = false,
      isLoadingMore = false,
      onLoadMore,
      emptyState,
      style,
      contentContainerStyle,
      onScroll,
      scrollEventThrottle = 16,
      ListHeaderComponent,
      ItemSeparatorComponent,
      ListFooterComponent,
      stickyHeaderIndices,
      onEndReachedThreshold = 0.5,
      drawDistance = 1000,
      refreshControlProps,
      showScrollToTop = true,
      scrollToTopThreshold = 30,
      scrollToTopBottomOffset,
    }: PaginatedListProps<T>,
    ref: ForwardedRef<PaginatedListRef<T>>
  ) => {
    const bottomPadding = useBottomPadding();
    const keyboardHeight = useKeyboardState((state) => (state.isVisible ? state.height : 0));
    const internalRef = useRef<FlashListRef<T>>(null);
    const [showScrollTop, setShowScrollTop] = useState(false);

    const { t } = useTranslation();
    const setListRef = useCallback(
      (instance: FlashListRef<T> | null) => {
        internalRef.current = instance;
        if (typeof ref === 'function') ref(instance);
        else if (ref) ref.current = instance;
      },
      [ref]
    );

    if (loading) {
      return <Loading fullScreen />;
    }

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      onScroll?.(event);
      if (showScrollToTop) {
        const offsetY = event.nativeEvent.contentOffset.y;
        setShowScrollTop(offsetY > scrollToTopThreshold);
      }
    };

    const handleScrollToTop = () => {
      internalRef.current?.scrollToOffset({ offset: 0, animated: true });
    };

    const scrollToTopBottom = scrollToTopBottomOffset ?? bottomPadding;

    const footer = isLoadingMore ? (
      <View style={styles.footer}>
        {renderListComponent(ListFooterComponent)}
        {isLoadingMore && <Loading size="small" />}
      </View>
    ) : (
      renderListComponent(ListFooterComponent)
    );

    const emptyComponent =
      data.length === 0 && emptyState ? <EmptyState {...emptyState} /> : undefined;

    return (
      <View style={styles.container}>
        <FlashList
          ref={setListRef}
          data={data}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          numColumns={numColumns}
          drawDistance={drawDistance}
          horizontal={false}
          alwaysBounceHorizontal={false}
          showsHorizontalScrollIndicator={false}
          style={[styles.list, style]}
          refreshControl={
            onRefresh ? (
              <AppRefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                {...refreshControlProps}
              />
            ) : undefined
          }
          contentContainerStyle={[
            contentContainerStyle,
            automaticContentPadding &&
              styles.contentPadding(bottomPadding + Math.max(0, keyboardHeight)),
          ]}
          keyboardDismissMode={keyboardDismissMode}
          keyboardShouldPersistTaps="handled"
          onScroll={handleScroll}
          scrollEventThrottle={scrollEventThrottle}
          onEndReached={() => {
            if (hasNextPage && !isLoadingMore && !refreshing) {
              onLoadMore?.();
            }
          }}
          onEndReachedThreshold={onEndReachedThreshold}
          ListHeaderComponent={ListHeaderComponent}
          stickyHeaderIndices={stickyHeaderIndices}
          ItemSeparatorComponent={ItemSeparatorComponent ?? DefaultItemSeparator}
          ListEmptyComponent={emptyComponent}
          ListFooterComponent={footer}
        />

        {showScrollToTop && showScrollTop ? (
          <View style={[styles.scrollTopFabWrap, styles.fabOffset(scrollToTopBottom)]}>
            <IconButton
              icon="arrow-up"
              variant="outline"
              size="sm"
              onPress={handleScrollToTop}
              accessibilityLabel={t('common.scrollToTop')}
            />
          </View>
        ) : null}
      </View>
    );
  }
) as <T>(
  props: PaginatedListProps<T> & { ref?: ForwardedRef<PaginatedListRef<T>> }
) => ReactElement;

function renderListComponent<T>(component: PaginatedListProps<T>['ListFooterComponent']) {
  if (!component) {
    return null;
  }

  if (isValidElement(component)) {
    return component;
  }

  const Component = component as ComponentType;
  return <Component />;
}

function DefaultItemSeparator() {
  return <View style={styles.separator} />;
}
