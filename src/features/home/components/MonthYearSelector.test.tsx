import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type * as ReactNative from 'react-native';
import { MonthYearSelector } from './MonthYearSelector';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

jest.mock('@/common/components', () => {
  const { Text } = jest.requireActual<typeof ReactNative>('react-native');
  return {
    Icon: () => null,
    Text: ({ children }: { children: ReactNode }) => <Text>{children}</Text>,
    DateTimeField: () => null,
  };
});

const today = new Date(2026, 9, 26);

describe('MonthYearSelector', () => {
  it('shows the selected month and year', async () => {
    await render(
      <MonthYearSelector selectedDate={new Date(2026, 2, 31)} today={today} onSelect={jest.fn()} />
    );

    expect(screen.getByText('March 2026')).toBeTruthy();
  });

  it('jumps back to today', async () => {
    const onSelect = jest.fn<(date: Date) => void>();
    await render(
      <MonthYearSelector selectedDate={new Date(2026, 8, 30)} today={today} onSelect={onSelect} />
    );

    await fireEvent.press(screen.getByLabelText('home.goToToday'));

    expect(onSelect).toHaveBeenCalledWith(today);
  });

  it('disables the today button when today is selected', async () => {
    await render(<MonthYearSelector selectedDate={today} today={today} onSelect={jest.fn()} />);

    expect(screen.getByLabelText('home.goToToday')).toBeDisabled();
  });
});
