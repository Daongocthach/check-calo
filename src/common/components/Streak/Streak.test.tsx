import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Streak } from './Streak';
import { STREAK_STATUS } from './Streak.constants';

jest.mock('@/common/components/Text', () => ({
  Text: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

jest.mock('@/common/components/Icon', () => ({
  Icon: () => null,
}));

describe('Streak', () => {
  it('renders weekly streak states with labels', () => {
    render(
      <Streak
        title="This week"
        subtitle="Keep it going"
        days={[
          STREAK_STATUS.COMPLETED,
          STREAK_STATUS.NONE,
          STREAK_STATUS.COMPLETED,
          STREAK_STATUS.COMPLETED,
          STREAK_STATUS.COMPLETED,
          STREAK_STATUS.MISSED_GOAL,
          STREAK_STATUS.COMPLETED,
        ]}
        dayLabels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
      />
    );

    expect(screen.getByText('This week')).toBeTruthy();
    expect(screen.getByText('Keep it going')).toBeTruthy();
    expect(screen.getByText('Mon')).toBeTruthy();
    expect(screen.getByLabelText('Mon: completed')).toBeTruthy();
    expect(screen.getByLabelText('Tue: not completed')).toBeTruthy();
    expect(screen.getByLabelText('Sat: missed goal')).toBeTruthy();
  });
});
