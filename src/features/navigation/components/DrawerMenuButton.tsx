import { useTranslation } from 'react-i18next';
import { IconButton } from '@/common/components';
import { useIsPermanentDrawer } from '../hooks/useIsPermanentDrawer';
import { useOpenDrawer } from '../hooks/useOpenDrawer';

/** Opens the drawer; renders nothing while the menu is pinned as a sidebar. */
export function DrawerMenuButton() {
  const { t } = useTranslation();
  const openDrawer = useOpenDrawer();
  const isPermanentDrawer = useIsPermanentDrawer();

  if (isPermanentDrawer) {
    return null;
  }

  return (
    <IconButton
      icon="menu"
      variant="outline"
      onPress={openDrawer}
      accessibilityLabel={t('drawer.open')}
    />
  );
}
