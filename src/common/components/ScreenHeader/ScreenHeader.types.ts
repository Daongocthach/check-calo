import type { ReactNode } from 'react';

/** Props for the {@link ScreenHeader} component. */
export interface ScreenHeaderProps {
  /** Title shown next to the back button. */
  title: string;
  /** Optional line below the title. */
  subtitle?: string;
  /** Whether to render the back button. Defaults to `true`. */
  showBack?: boolean;
  /** Overrides the default `router.back()` behaviour. */
  onBack?: () => void;
  /** Element rendered on the right side, usually an icon button. */
  right?: ReactNode;
  /** Whether to add the top safe-area inset. Defaults to `true`. */
  safeTop?: boolean;
}
