import { Image } from 'expo-image';
import { type ReactNode } from 'react';
import { View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Icon } from '@/common/components';

export interface FoodImagePreviewProps {
  imageUri?: string | null;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  iconSize?: number;
  children?: ReactNode;
}

export function FoodImagePreview({
  imageUri,
  style,
  imageStyle,
  iconSize = 24,
  children,
}: FoodImagePreviewProps) {
  const hasImage = typeof imageUri === 'string' && imageUri.length > 0;

  return (
    <View style={[styles.container, style]}>
      {hasImage ? (
        <Image source={{ uri: imageUri }} style={[styles.image, imageStyle]} contentFit="cover" />
      ) : (
        <View style={styles.placeholder}>
          <Icon name="image-outline" variant="primary" size={iconSize} />
        </View>
      )}
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
}));
