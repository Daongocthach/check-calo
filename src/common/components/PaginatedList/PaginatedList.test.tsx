import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type * as ReactNative from 'react-native';
import { PaginatedList } from './PaginatedList';

jest.mock('@shopify/flash-list', () => {
  const { Pressable, View } = jest.requireActual<typeof ReactNative>('react-native');
  return {
    FlashList: ({
      onEndReached,
      refreshControl,
    }: {
      onEndReached: () => void;
      refreshControl?: ReactNode;
    }) => (
      <View>
        <Pressable testID="list-end" onPress={onEndReached} />
        {refreshControl}
      </View>
    ),
  };
});
jest.mock('react-native-keyboard-controller', () => ({ useKeyboardState: () => 0 }));
jest.mock('@/hooks', () => ({ useBottomPadding: () => 16 }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@/common/components/EmptyState', () => ({ EmptyState: () => null }));
jest.mock('@/common/components/Loading', () => ({ Loading: () => null }));
jest.mock('@/common/components/IconButton', () => ({ IconButton: () => null }));

describe('PaginatedList', () => {
  it.each([
    { hasNextPage: true, isLoadingMore: false, refreshing: false, expected: 1 },
    { hasNextPage: false, isLoadingMore: false, refreshing: false, expected: 0 },
    { hasNextPage: true, isLoadingMore: true, refreshing: false, expected: 0 },
    { hasNextPage: true, isLoadingMore: false, refreshing: true, expected: 0 },
  ])('guards pagination for %j', async ({ expected, ...state }) => {
    const onLoadMore = jest.fn();
    await render(
      <PaginatedList
        data={['item']}
        keyExtractor={(item) => item}
        renderItem={() => null}
        onLoadMore={onLoadMore}
        {...state}
      />
    );
    await fireEvent.press(screen.getByTestId('list-end'));
    expect(onLoadMore).toHaveBeenCalledTimes(expected);
  });
});
