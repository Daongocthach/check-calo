import type { JestNativeMatchers } from '@testing-library/react-native/dist/matchers/types';

// RNTL v14 augments `@jest/expect`, but Jest 30 declares `Matchers` in `expect`, so the
// built-in matchers (toBeDisabled, toBeOnTheScreen, ...) are untyped on `@jest/globals` expect.
declare module 'expect' {
  interface Matchers<R extends void | Promise<void>, T = unknown> extends JestNativeMatchers<R> {}
}
