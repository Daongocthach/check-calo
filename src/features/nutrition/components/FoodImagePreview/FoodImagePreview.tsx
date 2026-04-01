import { Image } from 'expo-image';
import { type ReactNode } from 'react';
import { View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Icon, Text } from '@/common/components';

export interface FoodImagePreviewProps {
  imageUri?: string | null;
  thumbnailUri?: string | null;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  iconSize?: number;
  children?: ReactNode;
}

function getDevSyncBadgeLabel(imageUri?: string | null) {
  if (typeof imageUri !== 'string' || imageUri.length === 0) {
    return null;
  }

  if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
    return '_DEV_ SYNCED';
  }

  if (imageUri.startsWith('file://')) {
    return '_DEV_ LOCAL';
  }

  return '_DEV_ UNKNOWN';
}

export function FoodImagePreview({
  imageUri,
  thumbnailUri,
  style,
  imageStyle,
  iconSize = 24,
  children,
}: FoodImagePreviewProps) {
  const resolvedImageUri =
    typeof thumbnailUri === 'string' && thumbnailUri.length > 0 ? thumbnailUri : imageUri;
  const hasImage = typeof resolvedImageUri === 'string' && resolvedImageUri.length > 0;
  const devSyncBadgeLabel = __DEV__ ? getDevSyncBadgeLabel(imageUri) : null;

  return (
    <View style={[styles.container, style]}>
      {hasImage ? (
        <Image
          source={{ uri: resolvedImageUri }}
          style={[styles.image, imageStyle]}
          contentFit="cover"
        />
      ) : (
        <View style={styles.placeholder}>
          <Icon name="image-outline" variant="primary" size={iconSize} />
        </View>
      )}
      {devSyncBadgeLabel ? (
        <View style={styles.devBadge}>
          <Text variant="caption" weight="bold" color="inverse" numberOfLines={1}>
            {devSyncBadgeLabel}
          </Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.section,
  },
  devBadge: {
    position: 'absolute',
    top: theme.metrics.spacingV.p4,
    left: theme.metrics.spacing.p4,
    paddingHorizontal: theme.metrics.spacing.p8,
    paddingVertical: theme.metrics.spacingV.p4,
    borderRadius: theme.metrics.borderRadius.sm,
    backgroundColor: theme.colors.overlay.modal,
  },
}));
