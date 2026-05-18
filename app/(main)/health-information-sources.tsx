import * as WebBrowser from 'expo-web-browser';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Card, Icon, ScreenContainer, Text } from '@/common/components';
import { HEALTH_INFORMATION_SOURCE_SECTIONS } from '@/features/nutrition/constants/healthInformationSources';

export default function HealthInformationSourcesScreen() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();

  const handleOpenSource = useCallback((url: string) => {
    void WebBrowser.openBrowserAsync(url);
  }, []);

  return (
    <ScreenContainer scrollable padded={false} edges={['bottom']} style={styles.scrollContent}>
      <View style={styles.content}>
        <Text variant="body" color="secondary" style={styles.intro}>
          {t('healthInformationSourcesScreen.intro')}
        </Text>

        {HEALTH_INFORMATION_SOURCE_SECTIONS.map((section) => (
          <Card key={section.key} variant="filled" style={styles.sectionCard}>
            <Text variant="body" weight="bold" style={styles.sectionTitle}>
              {t(`healthInformationSourcesScreen.sections.${section.key}.title`)}
            </Text>
            <Text variant="body" color="secondary" style={styles.sectionDescription}>
              {t(`healthInformationSourcesScreen.sections.${section.key}.description`)}
            </Text>

            <View style={styles.referenceList}>
              {section.references.map((reference) => (
                <Pressable
                  key={reference.key}
                  accessibilityRole="link"
                  accessibilityLabel={t(reference.titleKey)}
                  style={styles.referenceCard}
                  onPress={() => handleOpenSource(reference.url)}
                >
                  <View style={styles.referenceCopy}>
                    <Text variant="body" weight="semibold" style={styles.referenceTitle}>
                      {t(reference.titleKey)}
                    </Text>
                    <Text variant="bodySmall" color="secondary" style={styles.referenceCitation}>
                      {t(reference.citationKey)}
                    </Text>
                  </View>
                  <Icon name="open-outline" variant="primary" size={22} />
                </Pressable>
              ))}
            </View>
          </Card>
        ))}

        <View style={styles.disclaimerCard}>
          <Icon name="information-circle-outline" color={theme.colors.state.warning} size={24} />
          <Text variant="body" style={styles.disclaimerText}>
            {t('healthInformationSourcesScreen.disclaimer')}
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create((theme) => ({
  scrollContent: {
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p20,
    paddingBottom: theme.metrics.spacingV.p40,
  },
  content: {
    gap: theme.metrics.spacingV.p24,
  },
  intro: {
    lineHeight: theme.metrics.spacingV.p28,
  },
  sectionCard: {
    gap: theme.metrics.spacingV.p16,
    backgroundColor: theme.colors.background.elevated,
  },
  sectionTitle: {
    lineHeight: theme.metrics.spacingV.p24,
  },
  sectionDescription: {
    fontSize: theme.fonts.size.md,
    lineHeight: theme.metrics.spacingV.p24,
  },
  referenceList: {
    gap: theme.metrics.spacingV.p12,
  },
  referenceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingVertical: theme.metrics.spacingV.p16,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderRadius: theme.metrics.borderRadius.lg,
    backgroundColor:
      theme.colors.mode === 'dark'
        ? theme.colors.background.surfaceAlt
        : theme.colors.background.surface,
  },
  referenceCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p8,
  },
  referenceTitle: {
    lineHeight: theme.metrics.spacingV.p24,
  },
  referenceCitation: {
    lineHeight: theme.metrics.spacingV.p20,
  },
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.metrics.spacing.p12,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingVertical: theme.metrics.spacingV.p16,
    borderWidth: 1,
    borderColor: theme.colors.state.warning,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.state.warningBg,
  },
  disclaimerText: {
    flex: 1,
    color: theme.colors.state.warning,
    lineHeight: theme.metrics.spacingV.p24,
  },
}));
