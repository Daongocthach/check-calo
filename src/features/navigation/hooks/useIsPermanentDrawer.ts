import { useWindowDimensions } from 'react-native';

/** Window width from which the drawer stays open as a sidebar (iPad Pro 13", not Split View). */
const PERMANENT_DRAWER_MIN_WIDTH = 900;

/** True when the menu is pinned beside the content, so screens drop their menu buttons. */
export function useIsPermanentDrawer(): boolean {
  const { width } = useWindowDimensions();

  return width >= PERMANENT_DRAWER_MIN_WIDTH;
}
