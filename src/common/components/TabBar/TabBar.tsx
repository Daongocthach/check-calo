import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';
import { Text } from '@/common/components/Text';
import { vs } from '@/theme/metrics';
import { styles } from './TabBar.styles';
import type { TabBarProps } from './TabBar.types';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IoniconsName; inactive: IoniconsName }> = {
  index: { active: 'home', inactive: 'home-outline' },
  progress: { active: 'bar-chart', inactive: 'bar-chart-outline' },
  achievements: { active: 'trophy', inactive: 'trophy-outline' },
  profile: { active: 'person-circle', inactive: 'person-circle-outline' },
};

export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + vs(8) }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const icons = TAB_ICONS[route.name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={onLongPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            style={styles.tab}
          >
            <Ionicons
              name={isFocused ? icons.active : icons.inactive}
              size={24}
              color={isFocused ? theme.colors.brand.primary : theme.colors.icon.tertiary}
            />
            <Text
              variant="caption"
              weight={isFocused ? 'semibold' : 'medium'}
              style={isFocused ? styles.labelActive : styles.label}
            >
              {options.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
