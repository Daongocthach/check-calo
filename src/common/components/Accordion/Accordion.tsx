import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Icon } from '@/common/components/Icon';
import { Text } from '@/common/components/Text';
import { vs } from '@/theme/metrics';
import { styles } from './Accordion.styles';
import type { AccordionItem, AccordionProps } from './Accordion.types';

function AccordionSection({
  item,
  isExpanded,
  isLast,
  onToggle,
}: {
  item: AccordionItem;
  isExpanded: boolean;
  isLast: boolean;
  onToggle: () => void;
}) {
  // Content mounts on first open, so collapsed sections cost nothing until they are used.
  const [hasOpened, setHasOpened] = useState(isExpanded);
  if (isExpanded && !hasOpened) {
    setHasOpened(true);
  }

  const rotation = useSharedValue(isExpanded ? 1 : 0);
  const contentHeight = useSharedValue(isExpanded ? 1 : 0);

  const maxContentHeight = vs(500);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 180}deg` }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentHeight.value,
    maxHeight: contentHeight.value * maxContentHeight,
  }));

  // Driven by `isExpanded` so sections collapsed by a sibling (single mode) animate too.
  useEffect(() => {
    rotation.value = withTiming(isExpanded ? 1 : 0, { duration: 250 });
    contentHeight.value = withTiming(isExpanded ? 1 : 0, { duration: 250 });
  }, [contentHeight, isExpanded, rotation]);

  const handleToggle = useCallback(() => {
    if (!item.disabled) {
      onToggle();
    }
  }, [item.disabled, onToggle]);

  return (
    <View style={[!isLast && styles.sectionDivider, item.disabled && styles.sectionDisabled]}>
      <Pressable
        onPress={handleToggle}
        disabled={item.disabled}
        style={styles.header}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded, disabled: item.disabled }}
      >
        <Text variant="body" weight="medium" style={styles.title}>
          {item.title}
        </Text>
        <Animated.View style={chevronStyle}>
          <Icon name="chevron-down" sizeVariant="lg" variant="secondary" />
        </Animated.View>
      </Pressable>
      <Animated.View
        style={[styles.content, contentStyle]}
        accessibilityElementsHidden={!isExpanded}
        importantForAccessibility={isExpanded ? 'auto' : 'no-hide-descendants'}
      >
        {hasOpened ? item.content : null}
      </Animated.View>
    </View>
  );
}

/**
 * Expandable/collapsible content sections with animated transitions.
 *
 * @example
 * ```tsx
 * <Accordion
 *   items={[{ id: '1', title: 'Section', content: <Text>Body</Text> }]}
 *   multiple
 * />
 * ```
 */
export function Accordion({ items, multiple = false, defaultExpanded = [] }: AccordionProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(defaultExpanded));

  const toggle = useCallback(
    (id: string) => {
      setExpanded((prev) => {
        const next = new Set(multiple ? prev : []);
        if (prev.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    [multiple]
  );

  return (
    <View style={styles.container}>
      {items.map((item, index) => (
        <AccordionSection
          key={item.id}
          item={item}
          isExpanded={expanded.has(item.id)}
          isLast={index === items.length - 1}
          onToggle={() => toggle(item.id)}
        />
      ))}
    </View>
  );
}
