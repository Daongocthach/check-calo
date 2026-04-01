import { Image } from 'expo-image';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Pressable,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import ImageViewer from 'react-native-image-zoom-viewer';
import { StyleSheet } from 'react-native-unistyles';
import { Icon, Text } from '@/common/components';

export interface FoodImagePreviewProps {
  imageUri?: string | null;
  thumbnailUri?: string | null;
  devSyncBadgeLabel?: string | null;
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
  devSyncBadgeLabel,
  style,
  imageStyle,
  iconSize = 24,
  children,
}: FoodImagePreviewProps) {
  const { t } = useTranslation();
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const resolvedImageUri =
    typeof thumbnailUri === 'string' && thumbnailUri.length > 0 ? thumbnailUri : imageUri;
  const hasImage = typeof resolvedImageUri === 'string' && resolvedImageUri.length > 0;
  const viewerImageUri =
    typeof imageUri === 'string' && imageUri.length > 0 ? imageUri : resolvedImageUri;
  const resolvedDevSyncBadgeLabel = __DEV__
    ? (devSyncBadgeLabel ?? getDevSyncBadgeLabel(imageUri))
    : null;

  return (
    <>
      <Pressable
        accessibilityRole={hasImage ? 'button' : undefined}
        accessibilityLabel={hasImage ? t('manualFoodEntry.openImageViewer') : undefined}
        disabled={!hasImage}
        onPress={() => {
          setIsViewerVisible(true);
        }}
      >
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
          {resolvedDevSyncBadgeLabel ? (
            <View style={styles.devBadge}>
              <Text variant="caption" weight="bold" color="inverse" numberOfLines={1}>
                {resolvedDevSyncBadgeLabel}
              </Text>
            </View>
          ) : null}
          {hasImage ? (
            <View style={styles.zoomBadge}>
              <Icon name="expand-outline" variant="inverse" size={22} />
            </View>
          ) : null}
          {children}
        </View>
      </Pressable>

      {hasImage && viewerImageUri ? (
        <Modal
          animationType="fade"
          visible={isViewerVisible}
          onRequestClose={() => {
            setIsViewerVisible(false);
          }}
        >
          <View style={styles.viewerContainer}>
            <ImageViewer
              imageUrls={[{ url: viewerImageUri }]}
              backgroundColor="black"
              enableSwipeDown
              onCancel={() => {
                setIsViewerVisible(false);
              }}
              onClick={() => {
                setIsViewerVisible(false);
              }}
              saveToLocalByLongPress={false}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('manualFoodEntry.closeImageViewer')}
              onPress={() => {
                setIsViewerVisible(false);
              }}
              style={styles.closeButton}
            >
              <Icon name="close-outline" variant="inverse" size={22} />
            </Pressable>
          </View>
        </Modal>
      ) : null}
    </>
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
  zoomBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: theme.metrics.spacing.p40,
    height: theme.metrics.spacing.p40,
    marginLeft: -theme.metrics.spacing.p20,
    marginTop: -theme.metrics.spacingV.p20,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.overlay.focus,
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: theme.colors.overlay.modal,
  },
  closeButton: {
    position: 'absolute',
    top: theme.metrics.spacingV.p48,
    right: theme.metrics.spacing.p16,
    width: theme.metrics.spacing.p40,
    height: theme.metrics.spacing.p40,
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.overlay.modal,
  },
}));
