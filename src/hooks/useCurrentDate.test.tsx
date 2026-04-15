import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, cleanup, renderHook } from 'expo-router/testing-library';
import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';
import { useCurrentDate } from './useCurrentDate';

describe('useCurrentDate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('updates to the next calendar day while the app stays open', () => {
    jest.setSystemTime(new Date(2026, 3, 14, 23, 59, 30));

    const { result } = renderHook(() => useCurrentDate());

    expect(result.current.getDate()).toBe(14);

    act(() => {
      jest.advanceTimersByTime(31_500);
    });

    expect(result.current.getDate()).toBe(15);
  });

  it('refreshes the current day when the app becomes active again', () => {
    jest.setSystemTime(new Date(2026, 3, 14, 8, 0, 0));

    const listeners: Array<(status: AppStateStatus) => void> = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
      listeners.push(listener);

      return {
        remove: jest.fn(),
      } as NativeEventSubscription;
    });

    const { result } = renderHook(() => useCurrentDate());

    act(() => {
      jest.setSystemTime(new Date(2026, 3, 15, 8, 0, 0));
      listeners.forEach((listener) => listener('active'));
    });

    expect(result.current.getDate()).toBe(15);
  });
});
