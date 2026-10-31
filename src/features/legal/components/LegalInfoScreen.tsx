import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { ScreenContainer, Text } from '@/common/components';
import { hs } from '@/theme/metrics';

type LegalScreenType = 'about' | 'terms' | 'privacy';
type TranslateFn = (key: string) => string;

interface LegalInfoScreenProps {
  type: LegalScreenType;
}

interface LegalItem {
  titleKey: string;
  bodyKey: string;
}

const TERMS_ITEMS: LegalItem[] = [
  {
    titleKey: 'legal.terms.items.acceptance.title',
    bodyKey: 'legal.terms.items.acceptance.body',
  },
  {
    titleKey: 'legal.terms.items.purpose.title',
    bodyKey: 'legal.terms.items.purpose.body',
  },
  {
    titleKey: 'legal.terms.items.account.title',
    bodyKey: 'legal.terms.items.account.body',
  },
  {
    titleKey: 'legal.terms.items.prohibited.title',
    bodyKey: 'legal.terms.items.prohibited.body',
  },
  {
    titleKey: 'legal.terms.items.liability.title',
    bodyKey: 'legal.terms.items.liability.body',
  },
];

const PRIVACY_ITEMS: LegalItem[] = [
  {
    titleKey: 'legal.privacy.items.collection.title',
    bodyKey: 'legal.privacy.items.collection.body',
  },
  {
    titleKey: 'legal.privacy.items.use.title',
    bodyKey: 'legal.privacy.items.use.body',
  },
  {
    titleKey: 'legal.privacy.items.sharing.title',
    bodyKey: 'legal.privacy.items.sharing.body',
  },
  {
    titleKey: 'legal.privacy.items.voice.title',
    bodyKey: 'legal.privacy.items.voice.body',
  },
  {
    titleKey: 'legal.privacy.items.security.title',
    bodyKey: 'legal.privacy.items.security.body',
  },
  {
    titleKey: 'legal.privacy.items.rights.title',
    bodyKey: 'legal.privacy.items.rights.body',
  },
  {
    titleKey: 'legal.privacy.items.changes.title',
    bodyKey: 'legal.privacy.items.changes.body',
  },
];

const ABOUT_FEATURES: LegalItem[] = [
  {
    titleKey: 'legal.about.features.tracking.title',
    bodyKey: 'legal.about.features.tracking.body',
  },
  {
    titleKey: 'legal.about.features.goals.title',
    bodyKey: 'legal.about.features.goals.body',
  },
  {
    titleKey: 'legal.about.features.meals.title',
    bodyKey: 'legal.about.features.meals.body',
  },
];

const TERMS_MORE_ITEMS: LegalItem[] = [
  {
    titleKey: 'legal.terms.moreItems.changes.title',
    bodyKey: 'legal.terms.moreItems.changes.body',
  },
  {
    titleKey: 'legal.terms.moreItems.retention.title',
    bodyKey: 'legal.terms.moreItems.retention.body',
  },
  {
    titleKey: 'legal.terms.moreItems.contact.title',
    bodyKey: 'legal.terms.moreItems.contact.body',
  },
];

function SummaryCard({ type }: { type: Exclude<LegalScreenType, 'about'> }) {
  const { t } = useTranslation();

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryCopy}>
        {type === 'terms' ? (
          <>
            <Text variant="bodySmall" weight="bold">
              {t('legal.updatedTitle')}
            </Text>
            <Text variant="caption" color="secondary">
              {t('legal.updatedDate')}
            </Text>
          </>
        ) : null}
        <Text variant="caption" color="secondary" style={styles.summaryBody}>
          {t(`legal.${type}.summary`)}
        </Text>
      </View>
    </View>
  );
}

function InfoItem({ item, index }: { item: LegalItem; index: number }) {
  const { t } = useTranslation();
  const translate = t as unknown as TranslateFn;

  return (
    <View style={styles.infoItem}>
      <View style={styles.itemCopy}>
        <Text variant="bodySmall" weight="bold" style={styles.itemTitle}>
          {`${index + 1}. ${translate(item.titleKey)}`}
        </Text>
        <Text variant="caption" color="secondary" style={styles.itemBody}>
          {translate(item.bodyKey)}
        </Text>
      </View>
    </View>
  );
}

function AboutScreenContent() {
  const { t } = useTranslation();

  return (
    <ScreenContainer scrollable padded={false} edges={['bottom']} title={t('settings.about')}>
      <View style={styles.aboutScreen}>
        <View style={styles.aboutHero}>
          <Text variant="body" weight="bold" style={styles.aboutTitle}>
            {t('legal.about.heroTitle')}
          </Text>
          <Text variant="body" color="secondary" style={styles.aboutSubtitle}>
            {t('legal.about.heroSubtitle')}
          </Text>
          <Text variant="caption" color="secondary" style={styles.aboutBody}>
            {t('legal.about.heroBody')}
          </Text>
        </View>

        <View style={styles.aboutFeatureList}>
          {ABOUT_FEATURES.map((item, index) => (
            <InfoItem key={item.titleKey} item={item} index={index} />
          ))}
        </View>
      </View>
    </ScreenContainer>
  );
}

function LegalDocumentScreen({ type }: { type: Exclude<LegalScreenType, 'about'> }) {
  const { t } = useTranslation();
  const items = type === 'terms' ? [...TERMS_ITEMS, ...TERMS_MORE_ITEMS] : PRIVACY_ITEMS;

  return (
    <ScreenContainer
      scrollable
      padded={false}
      edges={['bottom']}
      title={type === 'terms' ? t('settings.terms') : t('settings.privacy')}
    >
      <View style={styles.documentScreen}>
        <SummaryCard type={type} />

        <View style={styles.documentList}>
          {items.map((item, index) => (
            <InfoItem key={item.titleKey} item={item} index={index} />
          ))}
        </View>
      </View>
    </ScreenContainer>
  );
}

export function LegalInfoScreen({ type }: LegalInfoScreenProps) {
  if (type === 'about') {
    return <AboutScreenContent />;
  }

  return <LegalDocumentScreen type={type} />;
}

const styles = StyleSheet.create((theme) => ({
  aboutScreen: {
    flex: 1,
    gap: theme.metrics.spacingV.p20,
    paddingHorizontal: theme.metrics.spacing.p24,
    paddingTop: theme.metrics.spacingV.p28,
    paddingBottom: theme.metrics.spacingV.p24,
    backgroundColor: theme.colors.background.surfaceAlt,
  },
  aboutHero: {
    gap: theme.metrics.spacingV.p12,
    paddingTop: theme.metrics.spacingV.p12,
  },
  aboutTitle: {
    maxWidth: hs(240),
    fontSize: theme.fonts.size.xl,
    lineHeight: theme.fonts.size['2xl'],
    color: theme.colors.brand.primary,
  },
  aboutSubtitle: {
    maxWidth: hs(250),
    fontSize: theme.fonts.size.md,
    lineHeight: theme.fonts.size.xl,
  },
  aboutBody: {
    maxWidth: hs(270),
    lineHeight: theme.fonts.size.lg,
  },
  aboutFeatureList: {
    gap: theme.metrics.spacingV.p16,
  },
  documentScreen: {
    flex: 1,
    gap: theme.metrics.spacingV.p16,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p8,
    paddingBottom: theme.metrics.spacingV.p24,
  },
  summaryCard: {
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surfaceAlt,
  },
  summaryCopy: {
    flex: 1,
    gap: theme.metrics.spacingV.p4,
  },
  summaryBody: {
    paddingTop: theme.metrics.spacingV.p4,
    lineHeight: theme.fonts.size.lg,
  },
  documentList: {
    gap: theme.metrics.spacingV.p16,
  },
  infoItem: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p12,
  },
  itemCopy: {
    flex: 1,
    minWidth: 0,
    gap: theme.metrics.spacingV.p4,
  },
  itemTitle: {
    lineHeight: theme.fonts.size.lg,
  },
  itemBody: {
    lineHeight: theme.fonts.size.md,
  },
}));
