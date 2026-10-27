import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { Text } from '@/common/components/Text';
import { styles } from './TabBar.styles';
import type { TabBarProps } from './TabBar.types';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IoniconsName; inactive: IoniconsName }> = {
  index: { active: 'home', inactive: 'home-outline' },
  progress: { active: 'bar-chart', inactive: 'bar-chart-outline' },
  achievements: { active: 'trophy', inactive: 'trophy-outline' },
  profile: { active: 'person-circle', inactive: 'person-circle-outline' },
};

export function TabBar({ state, descriptors, emitter, navigateToTab }: TabBarProps) {
  const { theme } = useUnistyles();
  const focusedRoute = state.routes[state.index];
  const focusedTabBarStyle = focusedRoute
    ? descriptors[focusedRoute.key]?.options.tabBarStyle
    : undefined;

  // Screens opt out of the tab bar with `tabBarStyle: { display: 'none' }`.
  if (focusedTabBarStyle && StyleSheet.flatten(focusedTabBarStyle)?.display === 'none') {
    return null;
  }

  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = emitter.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigateToTab(route.key);
          }
        };

        const onLongPress = () => {
          emitter.emit({
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
