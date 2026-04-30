import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Icon, Text } from '@/common/components';
import { styles } from './NutritionReviewSheet.styles';

interface NutritionReviewSheetProps {
  title: string;
  subtitle: string;
  badge?: ReactNode;
  headerMeta?: ReactNode;
  headerActions?: ReactNode;
  footerActions?: ReactNode;
  children: ReactNode;
  iconColor: string;
}

export function NutritionReviewSheet({
  title,
  subtitle,
  badge,
  headerMeta,
  headerActions,
  footerActions,
  children,
  iconColor,
}: NutritionReviewSheetProps) {
  return (
    <View style={styles.sheetContent}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text variant="h3">{title}</Text>
          <Text variant="bodySmall" color="secondary" style={styles.subtitle}>
            {subtitle}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <View style={styles.sparkleGroup} pointerEvents="none">
            <Icon name="sparkles-outline" size={24} color={iconColor} />
          </View>
          {headerActions ? <View style={styles.headerActionButtons}>{headerActions}</View> : null}
        </View>
      </View>

      {headerMeta}

      {badge}

      {children}

      {footerActions ? <View style={styles.footerActions}>{footerActions}</View> : null}
    </View>
  );
}
