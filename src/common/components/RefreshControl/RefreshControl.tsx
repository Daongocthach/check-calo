import { RefreshControl as NativeRefreshControl } from 'react-native';
import type { RefreshControlProps as NativeRefreshControlProps } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

export interface AppRefreshControlProps extends Pick<
  NativeRefreshControlProps,
  | 'refreshing'
  | 'onRefresh'
  | 'tintColor'
  | 'colors'
  | 'progressBackgroundColor'
  | 'title'
  | 'titleColor'
> {}

export function AppRefreshControl({
  tintColor,
  colors,
  progressBackgroundColor,
  ...rest
}: AppRefreshControlProps) {
  const { theme } = useUnistyles();

  return (
    <NativeRefreshControl
      tintColor={tintColor ?? theme.colors.brand.primary}
      colors={colors ?? [theme.colors.brand.primary]}
      progressBackgroundColor={progressBackgroundColor ?? theme.colors.background.surface}
      {...rest}
    />
  );
}
