import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Button, Icon, ScreenContainer, Text } from '@/common/components';
import type { IconProps } from '@/common/components/Icon';
import { hs, vs } from '@/theme/metrics';

type LegalScreenType = 'about' | 'terms' | 'privacy';
type TranslateFn = (key: string) => string;

interface LegalInfoScreenProps {
  type: LegalScreenType;
}

interface LegalItem {
  icon: IconProps['name'];
  titleKey: string;
  bodyKey: string;
}

const TERMS_ITEMS: LegalItem[] = [
  {
    icon: 'receipt-outline',
    titleKey: 'legal.terms.items.acceptance.title',
    bodyKey: 'legal.terms.items.acceptance.body',
  },
  {
    icon: 'person-outline',
    titleKey: 'legal.terms.items.purpose.title',
    bodyKey: 'legal.terms.items.purpose.body',
  },
  {
    icon: 'shield-checkmark-outline',
    titleKey: 'legal.terms.items.account.title',
    bodyKey: 'legal.terms.items.account.body',
  },
  {
    icon: 'ban-outline',
    titleKey: 'legal.terms.items.prohibited.title',
    bodyKey: 'legal.terms.items.prohibited.body',
  },
  {
    icon: 'information-circle-outline',
    titleKey: 'legal.terms.items.liability.title',
    bodyKey: 'legal.terms.items.liability.body',
  },
];

const PRIVACY_ITEMS: LegalItem[] = [
  {
    icon: 'person-outline',
    titleKey: 'legal.privacy.items.collection.title',
    bodyKey: 'legal.privacy.items.collection.body',
  },
  {
    icon: 'server-outline',
    titleKey: 'legal.privacy.items.use.title',
    bodyKey: 'legal.privacy.items.use.body',
  },
  {
    icon: 'shield-checkmark-outline',
    titleKey: 'legal.privacy.items.sharing.title',
    bodyKey: 'legal.privacy.items.sharing.body',
  },
  {
    icon: 'lock-closed-outline',
    titleKey: 'legal.privacy.items.security.title',
    bodyKey: 'legal.privacy.items.security.body',
  },
  {
    icon: 'people-outline',
    titleKey: 'legal.privacy.items.rights.title',
    bodyKey: 'legal.privacy.items.rights.body',
  },
  {
    icon: 'information-circle-outline',
    titleKey: 'legal.privacy.items.changes.title',
    bodyKey: 'legal.privacy.items.changes.body',
  },
];

const ABOUT_FEATURES: LegalItem[] = [
  {
    icon: 'flame-outline',
    titleKey: 'legal.about.features.tracking.title',
    bodyKey: 'legal.about.features.tracking.body',
  },
  {
    icon: 'navigate-circle-outline',
    titleKey: 'legal.about.features.goals.title',
    bodyKey: 'legal.about.features.goals.body',
  },
  {
    icon: 'restaurant-outline',
    titleKey: 'legal.about.features.meals.title',
    bodyKey: 'legal.about.features.meals.body',
  },
];

const TERMS_MORE_ITEMS: LegalItem[] = [
  {
    icon: 'refresh-outline',
    titleKey: 'legal.terms.moreItems.changes.title',
    bodyKey: 'legal.terms.moreItems.changes.body',
  },
  {
    icon: 'time-outline',
    titleKey: 'legal.terms.moreItems.retention.title',
    bodyKey: 'legal.terms.moreItems.retention.body',
  },
  {
    icon: 'mail-outline',
    titleKey: 'legal.terms.moreItems.contact.title',
    bodyKey: 'legal.terms.moreItems.contact.body',
  },
];

function LeafBadge() {
  const { theme } = useUnistyles();

  return (
    <View style={styles.leafBadge}>
      <Icon name="leaf-outline" color={theme.colors.brand.primary} size={24} />
    </View>
  );
}

function SummaryCard({ type }: { type: Exclude<LegalScreenType, 'about'> }) {
  const { t } = useTranslation();
  const { theme } = useUnistyles();

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryCopy}>
        <Text variant="bodySmall" weight="bold">
          {t('legal.updatedTitle')}
        </Text>
        <Text variant="caption" color="secondary">
          {t('legal.updatedDate')}
        </Text>
        <Text variant="caption" color="secondary" style={styles.summaryBody}>
          {t(`legal.${type}.summary`)}
        </Text>
      </View>
      <View style={styles.documentArt}>
        <Icon
          name={type === 'privacy' ? 'lock-closed-outline' : 'shield-checkmark-outline'}
          color={theme.colors.brand.primary}
          size={42}
        />
      </View>
    </View>
  );
}

function InfoItem({ item, index, compact }: { item: LegalItem; index: number; compact?: boolean }) {
  const { t } = useTranslation();
  const translate = t as unknown as TranslateFn;
  const { theme } = useUnistyles();

  return (
    <View style={styles.infoItem}>
      <View style={styles.itemIconWrap}>
        <Icon name={item.icon} color={theme.colors.brand.primary} size={20} />
      </View>
      <View style={styles.itemCopy}>
        <View style={styles.itemTitleRow}>
          <Text variant="bodySmall" weight="bold" style={styles.itemTitle}>
            {`${index + 1}. ${translate(item.titleKey)}`}
          </Text>
          {compact ? <Icon name="chevron-down-outline" variant="muted" size={16} /> : null}
        </View>
        <Text variant="caption" color="secondary" style={styles.itemBody}>
          {translate(item.bodyKey)}
        </Text>
      </View>
    </View>
  );
}

function HelpCard() {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const router = useRouter();

  return (
    <View style={styles.helpCard}>
      <View style={styles.helpIcon}>
        <Icon name="headset-outline" color={theme.colors.brand.primary} size={22} />
      </View>
      <View style={styles.helpCopy}>
        <Text variant="bodySmall" weight="bold">
          {t('legal.help.title')}
        </Text>
        <Text variant="caption" color="secondary">
          {t('legal.help.body')}
        </Text>
      </View>
      <Button
        title={t('legal.help.action')}
        size="sm"
        rightIcon={<Icon name="chevron-forward-outline" variant="onBrand" size={16} />}
        onPress={() => router.push('/contact')}
      />
    </View>
  );
}

function AboutScreenContent() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <ScreenContainer scrollable padded={false} edges={['bottom']} tabBarAware>
      <View style={styles.aboutScreen}>
        <View style={styles.aboutHero}>
          <LeafBadge />
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

        <View style={styles.aboutCtaCard}>
          <Text variant="bodySmall" weight="bold">
            {t('legal.about.ctaTitle')}
          </Text>
          <Button
            title={t('legal.about.ctaAction')}
            size="sm"
            rightIcon={<Icon name="chevron-forward-outline" variant="onBrand" size={16} />}
            onPress={() => router.push('/welcome')}
            style={styles.aboutButton}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

function LegalDocumentScreen({ type }: { type: Exclude<LegalScreenType, 'about'> }) {
  const items = type === 'terms' ? [...TERMS_ITEMS, ...TERMS_MORE_ITEMS] : PRIVACY_ITEMS;

  return (
    <ScreenContainer scrollable padded={false} edges={['bottom']} tabBarAware>
      <View style={styles.documentScreen}>
        <SummaryCard type={type} />

        <View style={styles.documentList}>
          {items.map((item, index) => (
            <InfoItem key={item.titleKey} item={item} index={index} compact={type === 'privacy'} />
          ))}
        </View>
        {type !== 'terms' ? <HelpCard /> : null}
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
  leafBadge: {
    width: hs(42),
    height: hs(42),
    borderRadius: theme.metrics.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.state.successBg,
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
  aboutCtaCard: {
    gap: theme.metrics.spacingV.p12,
    alignItems: 'flex-start',
    padding: theme.metrics.spacing.p16,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.state.successBg,
  },
  aboutButton: {
    paddingHorizontal: theme.metrics.spacing.p16,
  },
  documentScreen: {
    flex: 1,
    gap: theme.metrics.spacingV.p16,
    paddingHorizontal: theme.metrics.spacing.p16,
    paddingTop: theme.metrics.spacingV.p8,
    paddingBottom: theme.metrics.spacingV.p24,
  },
  summaryCard: {
    minHeight: vs(126),
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
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
  documentArt: {
    width: hs(88),
    height: hs(88),
    borderRadius: theme.metrics.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.state.successBg,
  },
  documentList: {
    gap: theme.metrics.spacingV.p16,
  },
  infoItem: {
    flexDirection: 'row',
    gap: theme.metrics.spacing.p12,
  },
  itemIconWrap: {
    width: hs(34),
    height: hs(34),
    borderRadius: theme.metrics.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.state.successBg,
  },
  itemCopy: {
    flex: 1,
    minWidth: 0,
    gap: theme.metrics.spacingV.p4,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p8,
  },
  itemTitle: {
    flex: 1,
    lineHeight: theme.fonts.size.lg,
  },
  itemBody: {
    lineHeight: theme.fonts.size.md,
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.metrics.spacing.p12,
    padding: theme.metrics.spacing.p12,
    borderRadius: theme.metrics.borderRadius.xl,
    backgroundColor: theme.colors.background.surfaceAlt,
  },
  helpIcon: {
    width: hs(36),
    height: hs(36),
    borderRadius: theme.metrics.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.state.successBg,
  },
  helpCopy: {
    flex: 1,
    minWidth: 0,
    gap: theme.metrics.spacingV.p4,
  },
}));
