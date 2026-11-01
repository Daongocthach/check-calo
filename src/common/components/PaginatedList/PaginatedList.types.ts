import type { FlashListProps, FlashListRef, ListRenderItem } from '@shopify/flash-list';
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControlProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import type { EmptyStateProps } from '@/common/components/EmptyState';

export type PaginatedListRef<T> = FlashListRef<T>;

export interface PaginatedListProps<T> {
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: ListRenderItem<T>;
  numColumns?: number;
  /** Disable when a parent already handles safe-area and keyboard spacing. */
  automaticContentPadding?: boolean;
  keyboardDismissMode?: FlashListProps<T>['keyboardDismissMode'];
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  hasNextPage?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  emptyState?: EmptyStateProps;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle?: number;
  ListHeaderComponent?: FlashListProps<T>['ListHeaderComponent'];
  ItemSeparatorComponent?: FlashListProps<T>['ItemSeparatorComponent'];
  ListFooterComponent?: FlashListProps<T>['ListFooterComponent'];
  stickyHeaderIndices?: FlashListProps<T>['stickyHeaderIndices'];
  onEndReachedThreshold?: number;
  drawDistance?: number;
  refreshControlProps?: Pick<
    RefreshControlProps,
    'tintColor' | 'colors' | 'progressBackgroundColor' | 'title' | 'titleColor'
  >;
  showScrollToTop?: boolean;
  scrollToTopThreshold?: number;
  scrollToTopBottomOffset?: number;
}
