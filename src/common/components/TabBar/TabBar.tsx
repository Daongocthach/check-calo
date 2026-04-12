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
  stats: { active: 'stats-chart', inactive: 'stats-chart-outline' },
  add: { active: 'add', inactive: 'add' },
  menu: { active: 'restaurant', inactive: 'restaurant-outline' },
  profile: { active: 'person', inactive: 'person-outline' },
};

export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();

  return (
    <View style={[styles.container, { marginBottom: insets.bottom + vs(12) }]}>
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
        const iconName = isFocused ? icons.active : icons.inactive;
        const isAddTab = route.name === 'add';
        let iconColor = theme.colors.icon.primary;

        if (isAddTab) {
          iconColor = theme.colors.icon.inverse;
        } else if (isFocused) {
          iconColor = theme.colors.icon.primary;
        }

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={onLongPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            style={[styles.tab, isAddTab ? styles.addTab : styles.standardTab]}
          >
            {isAddTab ? (
              <View style={styles.addTabContent}>
                <View style={[styles.addBubble, isFocused && styles.addBubbleActive]}>
                  <View
                    style={[
                      styles.addBubbleGradient,
                      styles.addBubbleSolid,
                      isFocused && styles.addBubbleSolidActive,
                    ]}
                  >
                    <Ionicons name={iconName} size={24} color={iconColor} />
                  </View>
                </View>
                {isFocused ? (
                  <View style={styles.addTabActiveBadge}>
                    <Ionicons name="sparkles" size={11} color={theme.colors.text.onBrand} />
                  </View>
                ) : null}
                {isFocused ? (
                  <View style={styles.addTabActiveLabel}>
                    <Ionicons name="radio-button-on" size={10} color={theme.colors.text.onBrand} />
                    <Text variant="caption" weight="semibold" color="onBrand">
                      {options.title}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <View
                style={[
                  styles.tabBubble,
                  isFocused ? styles.tabBubbleActive : styles.tabBubbleInactive,
                ]}
              >
                <Ionicons name={iconName} size={18} color={iconColor} />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
