import type { ComponentProps } from 'react';
import type { Icon } from '@/common/components';

type IconName = ComponentProps<typeof Icon>['name'];

export interface DrawerRouteItem {
  /** Route name inside `app/(main)/(drawer)`. */
  name: 'index' | 'buddy' | 'settings';
  labelKey: 'drawer.dashboard' | 'drawer.buddy' | 'drawer.settings';
  icon: IconName;
  activeIcon: IconName;
}

export const DRAWER_ROUTES: readonly DrawerRouteItem[] = [
  { name: 'index', labelKey: 'drawer.dashboard', icon: 'home-outline', activeIcon: 'home' },
  { name: 'buddy', labelKey: 'drawer.buddy', icon: 'paw-outline', activeIcon: 'paw' },
  {
    name: 'settings',
    labelKey: 'drawer.settings',
    icon: 'settings-outline',
    activeIcon: 'settings',
  },
];
