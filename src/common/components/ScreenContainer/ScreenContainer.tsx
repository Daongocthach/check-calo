import { ScrollView, View } from 'react-native';
import { ScreenHeader } from '@/common/components/ScreenHeader';
import { styles } from './ScreenContainer.styles';
import type { ScreenContainerProps } from './ScreenContainer.types';

/**
 * A safe-area-aware screen wrapper that supports both static and scrollable layouts.
 *
 * @example
 * ```tsx
 * <ScreenContainer scrollable padded edges={['top', 'bottom']}>
 *   <Text>Screen content</Text>
 * </ScreenContainer>
 * ```
 */
export function ScreenContainer({
  children,
  scrollable = false,
  padded = true,
  edges = ['top'],
  title,
  subtitle,
  headerRight,
  style,
}: ScreenContainerProps) {
  const header = title ? (
    <ScreenHeader title={title} subtitle={subtitle} right={headerRight} />
  ) : null;
  const hasTop = !header && edges.includes('top');
  const bottomStyle = edges.includes('bottom') ? styles.edgeBottom : null;

  if (scrollable) {
    return (
      <View style={styles.container}>
        {header}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            hasTop && styles.edgeTop,
            bottomStyle,
            padded && styles.padded,
            style,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {header}
      <View
        style={[
          styles.content,
          hasTop && styles.edgeTop,
          bottomStyle,
          padded && styles.padded,
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
}
