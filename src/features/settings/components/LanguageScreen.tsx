import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { Icon, ScreenContainer, Text } from '@/common/components';
import { APP_LANGUAGES, LANGUAGE_INFO, toAppLanguage, type AppLanguage } from '@/i18n/languages';
import { usePreferences } from '../hooks/usePreferences';

/** Language picker: each row names the language in itself, then in the current app language. */
export function LanguageScreen() {
  const { t, i18n } = useTranslation();
  const { changeLanguage } = usePreferences();
  const current = toAppLanguage(i18n.language);
  // Current language first, fixed on open so rows don't jump while the user is choosing.
  const [order] = useState<AppLanguage[]>(() => [
    current,
    ...APP_LANGUAGES.filter((language) => language !== current),
  ]);

  return (
    <ScreenContainer scrollable padded={false} edges={['bottom']} title={t('language.label')}>
      <View style={styles.screen}>
        <View style={styles.card}>
          {order.map((language, index) => {
            const { labelKey } = LANGUAGE_INFO[language];
            const selected = language === current;

            return (
              <Pressable
                key={language}
                onPress={() => changeLanguage(language)}
                accessibilityRole="radio"
                accessibilityLabel={t(`language.${labelKey}`)}
                accessibilityState={{ checked: selected }}
                style={({ pressed }) => [
                  styles.row,
                  index === order.length - 1 && styles.lastRow,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.text}>
                  <Text variant="body" weight={selected ? 'semibold' : 'medium'}>
                    {t(`language.${labelKey}`)}
                  </Text>
                  {selected ? null : (
                    <Text variant="caption" color="secondary">
                      {t(`language.localized.${labelKey}`)}
                    </Text>
                  )}
                </View>
                {selected ? <Icon name="checkmark" variant="brand" size={22} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p8,
    paddingBottom: theme.metrics.spacingV.p24,
  },
  card: {
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surface,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    minHeight: theme.metrics.spacingV.p56,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingVertical: theme.metrics.spacingV.p12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.subtle,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  pressed: {
    backgroundColor: theme.colors.overlay.hover,
  },
  text: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
}));
