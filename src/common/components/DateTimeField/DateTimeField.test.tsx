import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type * as ReactNative from 'react-native';
import { DateTimeField } from './DateTimeField';

const mockOpenSheet = jest.fn<(content: ReactNode, options: unknown) => void>();
const mockCloseSheet = jest.fn();

jest.mock('@/providers/bottom-sheet', () => ({
  useAppBottomSheet: () => ({ openSheet: mockOpenSheet, closeSheet: mockCloseSheet }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'vi' } }),
}));
jest.mock('@/common/components/Button', () => {
  const { Pressable, Text } = jest.requireActual<typeof ReactNative>('react-native');
  return {
    Button: ({ title, onPress }: { title: string; onPress: () => void }) => (
      <Pressable onPress={onPress}>
        <Text>{title}</Text>
      </Pressable>
    ),
  };
});
jest.mock('@/common/components/Icon', () => ({ Icon: () => null }));
jest.mock('./CalendarPicker', () => {
  const { Pressable } = jest.requireActual<typeof ReactNative>('react-native');
  return {
    CalendarPicker: ({ onDateSelect }: { onDateSelect: (date: Date) => void }) => (
      <Pressable testID="select-date" onPress={() => onDateSelect(new Date(2026, 1, 28))} />
    ),
  };
});
jest.mock('./TimePicker', () => {
  const { Pressable } = jest.requireActual<typeof ReactNative>('react-native');
  return {
    TimePicker: ({ onChange }: { onChange: (time: { hour: number; minute: number }) => void }) => (
      <Pressable testID="select-time" onPress={() => onChange({ hour: 23, minute: 45 })} />
    ),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});

async function openPicker(mode: 'date' | 'time' | 'datetime', maximumDate?: Date) {
  const onChange = jest.fn();
  const value = mode === 'time' ? '10:30' : '2026-01-31 10:30';
  await render(
    <DateTimeField
      label="picker"
      mode={mode}
      value={mode === 'date' ? '2026-01-31' : value}
      maximumDate={maximumDate}
      onChange={onChange}
    />
  );
  await fireEvent.press(screen.getByLabelText('picker'));
  const content = mockOpenSheet.mock.calls[0]?.[0];
  await render(<>{content}</>);
  return onChange;
}

describe('DateTimeField custom picker', () => {
  it('keeps date and time changes in a draft until confirmed', async () => {
    const onChange = await openPicker('datetime');
    await fireEvent.press(screen.getByTestId('select-date'));
    await fireEvent.press(screen.getByTestId('select-time'));
    expect(onChange).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText('common.confirm'));
    expect(onChange).toHaveBeenCalledWith('2026-02-28 23:45');
    expect(mockCloseSheet).toHaveBeenCalled();
  });

  it('discards cancelled changes', async () => {
    const onChange = await openPicker('date');
    await fireEvent.press(screen.getByTestId('select-date'));
    await fireEvent.press(screen.getByText('common.cancel'));
    expect(onChange).not.toHaveBeenCalled();
    expect(mockCloseSheet).toHaveBeenCalled();
  });

  it('preserves the time-only output format', async () => {
    const onChange = await openPicker('time');
    expect(screen.queryByTestId('select-date')).toBeNull();
    await fireEvent.press(screen.getByTestId('select-time'));
    await fireEvent.press(screen.getByText('common.confirm'));
    expect(onChange).toHaveBeenCalledWith('23:45');
  });

  it('enforces the maximum timestamp after a time change', async () => {
    const onChange = await openPicker('datetime', new Date(2026, 1, 28, 20, 0));
    await fireEvent.press(screen.getByTestId('select-date'));
    await fireEvent.press(screen.getByTestId('select-time'));
    await fireEvent.press(screen.getByText('common.confirm'));
    expect(onChange).toHaveBeenCalledWith('2026-02-28 20:00');
  });

  it('does not open a disabled field', async () => {
    await render(<DateTimeField label="picker" value="" disabled onChange={jest.fn()} />);
    await fireEvent.press(screen.getByLabelText('picker'));
    expect(mockOpenSheet).not.toHaveBeenCalled();
  });
});
