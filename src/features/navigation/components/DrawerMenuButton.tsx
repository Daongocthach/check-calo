import { useTranslation } from 'react-i18next';
import { IconButton } from '@/common/components';
import { useOpenDrawer } from '../hooks/useOpenDrawer';

export function DrawerMenuButton() {
  const { t } = useTranslation();
  const openDrawer = useOpenDrawer();

  return (
    <IconButton
      icon="menu"
      variant="outline"
      onPress={openDrawer}
      accessibilityLabel={t('drawer.open')}
    />
  );
}
